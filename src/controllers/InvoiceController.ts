import { Request, Response, NextFunction } from 'express';
import Invoice from '../models/Invoice.model';
import { AuditService } from '../services/AuditService';
import { NotificationService } from '../services/NotificationService';
import Company from '../models/company.model';
//import Subscription from '../models/Subscription';
//import Plan from '../models/Plan';
import User from '../models/user.model';
//import { PaymentProvider } from '../services/PaymentProvider';
import mongoose from 'mongoose';

export class InvoiceController {
    /**
     * Lista faturas com suporte a filtros e paginação.
     * Super Admin vê tudo, Lojista vê apenas as suas.
     */
    static async getInvoices(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                return next(new Error('Usuário não autenticado'));
            }
            const user = req.user;
            const perPage = 15;
            const page = parseInt(req.query.page as string) || 1;
            let query: any = {};

            if (user.type === 'company_owner') {
                query.company_id = user.company_id;
            } else if (req.query.company_id) {
                query.company_id = req.query.company_id;
            }

            if (req.query.status) query.status = req.query.status;

            const count = await Invoice.countDocuments(query);
            const invoices = await Invoice.find(query)
                .populate('company_id', 'name')
                .sort({ created_at: -1 })
                .skip(perPage * page - perPage)
                .limit(perPage)
                .lean();

            return res.status(200).json({
                success: true,
                data: invoices,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            });
        } catch (e) {
            next(e);
        }
    }

    static async getInvoiceById(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                return next(new Error('Usuário não autenticado'));
            }
            const { id } = req.params;
            const user = req.user;

            const invoice = await Invoice.findById(id).populate('company_id', 'name owner_name email').lean();

            if (!invoice) throw new Error('Fatura não encontrada');

            // Proteção de Tenant
            if (
                user.type === 'company_owner' &&
                String(invoice.company_id._id) !== String(user.company_id)
            ) {
                req.errorStatus = 403;
                throw new Error('Acesso negado: Esta fatura pertence a outro estabelecimento.');
            }

            return res.status(200).json({
                success: true,
                data: invoice
            });
        } catch (e) {
            next(e);
        }
    }

    static async markAsPaid(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const updated = await Invoice.findByIdAndUpdate(
                id,
                {
                    status: 'paid',
                    payment_date: new Date()
                },
                { new: true }
            );

            await AuditService.log(req, {
                action: 'INVOICE_MANUAL_PAID',
                module: 'BILLING',
                severity: 'warn',
                details: { invoice_id: id }
            });

            return res.status(200).json({ success: true, data: updated });
        } catch (e) {
            next(e);
        }
    }

    /**
     * Varre faturas pendentes e marca como 'overdue' se vencidas.
     * Além disso, envia push de cobrança a cada 5 dias de atraso.
     * Chamado automaticamente pelo CronService.
     */
    static async processOverdueInvoices() {
        try {
            const now = new Date();
            console.log('💰 [CRON]: Verificando faturas vencidas...');

            // 1. Encontra e marca faturas vencidas de 'pending' para 'overdue'
            const pendingInvoices = await Invoice.find({
                status: 'pending',
                due_date: { $lt: now }
            });

            for (const invoice of pendingInvoices) {
                await Invoice.findByIdAndUpdate(invoice._id, {
                    status: 'overdue',
                    updated_at: now
                });

                const est = await Company.findById(invoice.company_id);
                if (est) {
                    await NotificationService.sendOrderStatusPush(
                        (await mongoose.connection.model('users').findOne({company_id: est._id, type: 'company_owner'}))?._id?.toString(),
                        `Sua fatura de R$ ${invoice.amount.toFixed(2)} está vencida. Evite o bloqueio dos serviços realizando o pagamento.`
                    );
                }
                console.log(`⚠️ Fatura ${invoice._id} marcada como ATRASADA.`);
            }

            // 2. Notifica a cada 5 dias para faturas que já estão 'overdue'
            const overdueInvoices = await Invoice.find({ status: 'overdue' });
            for (const invoice of overdueInvoices) {
                const daysOverdue = Math.floor(
                    (now.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysOverdue > 0 && daysOverdue % 5 === 0) {
                    await NotificationService.sendInvoiceOverduePush(
                        String(invoice.company_id),
                        invoice.amount,
                        daysOverdue
                    );
                }
            }

            console.log(`✅ [CRON]: Verificação de faturas vencidas concluída.`);
        } catch (error) {
            console.error('❌ [CRON ERROR]: Falha ao processar faturas vencidas:', error);
        }
    }

    /**
     * Gera faturas pendentes preventivas para assinaturas ativas que vencem em 5 dias.
     * Chamado automaticamente pelo CronService.
     */
    static async generatePreventiveInvoices() {
        try {
            const now = new Date();
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 5);

            const startOfTarget = new Date(targetDate);
            startOfTarget.setHours(0, 0, 0, 0);
            const endOfTarget = new Date(targetDate);
            endOfTarget.setHours(23, 59, 59, 999);

            //const SubscriptionModel = mongoose.connection.model('subscriptions', Subscription.schema);
            //const PlanModel = mongoose.connection.model('plans', Plan.schema);

            //const expiringSubscriptions = await SubscriptionModel.find({
            //status: { $in: ['active', 'trialing'] },
            //current_period_end: { $gte: startOfTarget, $lte: endOfTarget }
            // }).populate('plan_id');

            //console.log(
            //  `📡 [Preventive Billing]: Encontradas ${expiringSubscriptions.length} assinaturas vencendo em 5 dias.`
            //);

            // for (const sub of expiringSubscriptions) {
            //     const plan: any = sub.plan_id;

            //     // Plano trial ou grátis não gera fatura financeira
            //     if (!plan || plan.name?.toLowerCase() === 'trial' || plan.price === 0) {
            //         console.log(
            //             `ℹ️ [Preventive Billing]: Assinatura de Trial ou Gratuita para adega ${sub.company_id}. Nenhuma fatura gerada.`
            //         );
            //         continue;
            //     }

            //     // Verifica se já existe fatura pendente/atrasada criada para este vencimento
            //     const existingInvoice = await Invoice.findOne({
            //         subscription_id: sub._id,
            //         status: { $in: ['pending', 'overdue'] },
            //         due_date: { $gte: startOfTarget, $lte: endOfTarget }
            //     });

            //     if (existingInvoice) {
            //         console.log(
            //             `ℹ️ [Preventive Billing]: Fatura já gerada anteriormente para a assinatura ${sub._id}.`
            //         );
            //         continue;
            //     }

            //     const newInvoice = new Invoice({
            //         company_id: sub.company_id,
            //         subscription_id: sub._id,
            //         amount: sub.price_at_subscription || plan.price || 0,
            //         status: 'pending',
            //         due_date: sub.current_period_end,
            //         notes: `Mensalidade SaaS gerada automaticamente para o ciclo vencendo em ${sub.current_period_end.toLocaleDateString('pt-BR')}`
            //     });

            //     await newInvoice.save();
            //     console.log(
            //         `✅ [Preventive Billing]: Fatura PENDENTE gerada para o estabelecimento ${sub.company_id} (Valor: R$ ${newInvoice.amount.toFixed(2)})`
            //     );
            // }
        } catch (error) {
            console.error('❌ [Preventive Billing Error]:', error);
        }
    }

    /**
     * Endpoint para gerar o pagamento PIX de uma fatura específica, calculando multa e juros se atrasado.
     */
    static async generatePixForInvoice(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const invoice = await Invoice.findById(id);
            if (!invoice) {
                req.errorStatus = 404;
                throw new Error('Fatura não encontrada');
            }

            if (invoice.status === 'paid') {
                return res.status(400).json({ success: false, message: 'Esta fatura já está paga.' });
            }

            const now = new Date();
            const originalAmount = invoice.amount;
            let finalAmount = originalAmount;
            let juros = 0;
            let multa = 0;

            // Se estiver vencida, calcula multa de 2% e juros de 0.033% ao dia
            if (now > new Date(invoice.due_date)) {
                const daysOverdue = Math.floor(
                    (now.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysOverdue > 0) {
                    multa = originalAmount * 0.02;
                    juros = originalAmount * 0.00033 * daysOverdue;
                    finalAmount = originalAmount + multa + juros;
                }
            }

            // Arredonda para duas casas decimais
            finalAmount = Math.round(finalAmount * 100) / 100;

            const UserModel = mongoose.connection.model('users', User.schema);
            const superAdmin: any = await UserModel.findOne({ type: 'super_admin' }).select('global_payment_config');

            if (!superAdmin || !superAdmin.global_payment_config) {
                req.errorStatus = 500;
                throw new Error('Configuração de pagamento global do sistema não encontrada.');
            }

            const company = await Company.findById(invoice.company_id);
            if (!company) {
                req.errorStatus = 404;
                throw new Error('Estabelecimento não encontrado');
            }

            //const gateway = PaymentProvider.getGateway(superAdmin.global_payment_config);
            const externalReference = `INV_${invoice._id}__${invoice.company_id}`;

            console.log(`[SaaS Billing] Gerando PIX de R$ ${finalAmount} para fatura ${invoice._id}`);

            // const pixResponse = await gateway.createPix({
            //     name: company.owner_name || company.name || 'Estabelecimento',
            //     email: company.email,
            //     amount: finalAmount,
            //     cpf: '00000000000',
            //     external_reference: externalReference,
            //     company_id: String(invoice.company_id)
            // });

            // Atualiza as notas da fatura registrando o cálculo de juros
            await Invoice.findByIdAndUpdate(invoice._id, {
                notes: `PIX gerado em ${now.toLocaleString('pt-BR')} com Multa: R$ ${multa.toFixed(2)} e Juros: R$ ${juros.toFixed(2)}.`
            });

            return res.status(200).json({
                success: true,
                message: 'Pagamento PIX da fatura gerado com sucesso.',
                data: {
                    //qr_code_base64: pixResponse.qr_code_base64 || pixResponse.formData?.qr_code_base64,
                    //qr_code: pixResponse.qr_code || pixResponse.formData?.qr_code,
                    amount: finalAmount
                }
            });
        } catch (e) {
            next(e);
        }
    }
}
