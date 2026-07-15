import { Request, Response, NextFunction } from 'express';
import Establishment from '../../models/establishment.model';
import Invoice from '../../models/Invoice.model';

export class SubscriptionMiddleware {
    /**
     * Bloqueia o acesso de lojistas com assinatura vencida (Paywall)
     */
    static async checkSubscriptionActive(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        
        // Usuários comuns ou Super Admin não são bloqueados pelo paywall da adega
        if (!user || user.type === 'super_admin' || user.type === 'admin') return next();
        
        try {
            const establishment = req.establishment; // Carregado previamente pelo resolveTenant
            if (!establishment) return next();

            const now = new Date();

            // CASO 1: Plano experimental (Trial / status trialing)
            const isTrial = establishment.subscription_status === 'trialing' || establishment.subscription_status === 'trial';
            const nextPayment = new Date(establishment.next_payment_date);

            if (isTrial && now > nextPayment) {
                await Establishment.findByIdAndUpdate(establishment._id, { 
                    subscription_status: 'inactive',
                    status: 'inactive'
                });
                
                req.errorStatus = 402; // Payment Required
                return next(new Error('Seu período experimental (Trial) expirou. Por favor, assine um plano para continuar utilizando a plataforma.'));
            }

            // CASO 2: Planos Pagos regulares
            if (!isTrial) {
                // Busca todas as faturas não pagas da adega
                const unpaidInvoices = await Invoice.find({
                    establishment_id: establishment._id,
                    status: { $in: ['pending', 'overdue'] }
                }).sort({ due_date: 1 });

                let shouldBlock = false;
                let blockReason = '';

                // A: Bloqueio por acúmulo de faturas (>= 2)
                if (unpaidInvoices.length >= 2) {
                    shouldBlock = true;
                    blockReason = 'Sua conta foi suspensa por possuir 2 ou mais faturas pendentes de pagamento. Regularize seus débitos para continuar utilizando a plataforma.';
                }

                // B: Bloqueio por atraso maior que 30 dias em alguma fatura
                if (!shouldBlock && unpaidInvoices.length > 0) {
                    const oldestInvoice = unpaidInvoices[0];
                    const daysOverdue = Math.floor((now.getTime() - new Date(oldestInvoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
                    if (daysOverdue > 30) {
                        shouldBlock = true;
                        blockReason = `Sua conta foi suspensa por possuir uma fatura vencida há mais de 30 dias (vencimento em ${new Date(oldestInvoice.due_date).toLocaleDateString('pt-BR')}). Regularize para reativar seu acesso.`;
                    }
                }

                if (shouldBlock) {
                    if (establishment.subscription_status !== 'inactive') {
                        await Establishment.findByIdAndUpdate(establishment._id, { 
                            subscription_status: 'inactive',
                            status: 'inactive'
                        });
                    }
                    req.errorStatus = 402;
                    return next(new Error(blockReason));
                }
            }

            // Se o estabelecimento estava inativo mas agora está em dia, reativa automaticamente
            if (establishment.subscription_status === 'inactive') {
                await Establishment.findByIdAndUpdate(establishment._id, { 
                    subscription_status: 'active',
                    status: 'active'
                });
            }

            next();
        } catch (e: any) {
            next(e);
        }
    }
}
