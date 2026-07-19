import { Request, Response, NextFunction } from 'express';
import Plan from '../models/plan.model';
import Company from '../models/company.model';
import Subscription from '../models/subscription.model';
import { AuditService } from '../services/AuditService';
import User from '../models/user.model';
import { PaymentProvider } from '../services/PaymentProvider';

export class PlanController {
    static async getPlans(req: Request, res: Response, next: NextFunction) {
        try {
            // Busca todos os planos
            const plans = await Plan.find().lean();

            // Para cada plano, busca os estabelecimentos vinculados (No Banco Central HubDB)
            const plansWithEstablishments = await Promise.all(
                plans.map(async (plan) => {
                    const activeSubscriptions = await Subscription.find({
                        plan_id: plan._id,
                        status: 'active'
                    })
                        .populate('establishment_id', 'res_name cover status')
                        .lean();
                    return {
                        ...plan,
                        active_subscriptions: activeSubscriptions,
                        total_subscribers: activeSubscriptions.length
                    };
                })
            );

            return res.status(200).json({ success: true, data: plansWithEstablishments });
        } catch (e: any) {
            next(e);
        }
    }

    static async getPlanById(req: Request, res: Response, next: NextFunction) {
        try {
            const planId = req.params.id;
            const plan = await Plan.findById(planId).lean();
            if (!plan) throw new Error('Plano não encontrado');
            return res.status(200).json({ success: true, data: plan });
        } catch (e: any) {
            next(e);
        }
    }

    static async createPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const plan = await new Plan(req.body).save();
            return res.status(201).json({ success: true, data: plan });
        } catch (e: any) {
            next(e);
        }
    }

    static async updatePlan(req: Request, res: Response, next: NextFunction) {
        try {
            const planId = req.params.id;
            const updatedPlan = await Plan.findByIdAndUpdate(
                planId,
                { ...req.body, updated_at: new Date() },
                { new: true }
            );
            if (!updatedPlan) throw new Error('Plano não encontrado');
            return res.status(200).json({ success: true, data: updatedPlan });
        } catch (e: any) {
            next(e);
        }
    }

    static async updateStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const planId = req.params.id;
            const { status } = req.body;

            const updatedPlan = await Plan.findByIdAndUpdate(planId, { status, updated_at: new Date() }, { new: true });
            if (!updatedPlan) throw new Error('Plano não encontrado');
            return res.status(200).json({ success: true, data: updatedPlan });
        } catch (e: any) {
            next(e);
        }
    }

    static async deletePlan(req: Request, res: Response, next: NextFunction) {
        try {
            const planId = req.params.id;

            // Validação de Segurança: Não permite deletar se houver estabelecimentos vinculados
            // CORREÇÃO CRÍTICA: Bloqueia a remoção se houver contratos vigentes atados à este plano
            const hasLinkedSubscriptions = await Company.exists({ plan_id: planId });
            if (hasLinkedSubscriptions) {
                req.errorStatus = 400;
                throw new Error('Não é possível excluir um plano que possui estabelecimentos vinculados.');
            }

            await Plan.findByIdAndDelete(planId);
            return res.status(200).json({ success: true, message: 'Plano removido com sucesso' });
        } catch (e: any) {
            next(e);
        }
    }

    static async renewSubscriptionPix(req: Request, res: Response, next: NextFunction) {
        if (!req.user) {
            return next(new Error('Usuário não autenticado'));
        }
        const { subscriptionId } = req.params;
        const user = req.user; // User making the request
        let establishmentId = req.body.establishment_id; // For Super Admin

        try {
            if (!subscriptionId) {
                req.errorStatus = 400;
                throw new Error('ID da assinatura é obrigatório.');
            }

            // 1. Validar permissão e obter o establishment_id correto
            if (user.type === 'establishment_admin') {
                if (!user.establishment_id) {
                    req.errorStatus = 403;
                    throw new Error('Acesso negado: Seu usuário não possui um estabelecimento vinculado.');
                }
                establishmentId = user.establishment_id;
            } else if (user.type === 'super_admin') {
                if (!establishmentId) {
                    req.errorStatus = 400;
                    throw new Error('Para Super Admin, o campo establishment_id é obrigatório no corpo da requisição.');
                }
            } else {
                req.errorStatus = 403;
                throw new Error('Você não tem permissão para renovar assinaturas.');
            }

            // 2. Buscar a assinatura e o plano associado
            const subscription = await Subscription.findById(subscriptionId).populate('plan_id').lean();

            if (!subscription) {
                req.errorStatus = 404;
                throw new Error('Assinatura não encontrada.');
            }

            // 3. Verificar se a assinatura pertence ao estabelecimento correto (segurança)
            if (String(subscription.establishment_id) !== String(establishmentId)) {
                req.errorStatus = 403;
                throw new Error('Acesso negado: Esta assinatura não pertence ao seu estabelecimento.');
            }

            const plan: any = subscription.plan_id;
            if (!plan) {
                req.errorStatus = 500;
                throw new Error('Plano da assinatura não encontrado.');
            }

            const amount = plan.price;
            if (amount <= 0) {
                req.errorStatus = 400;
                throw new Error('Não é possível renovar um plano gratuito via PIX.');
            }

            // Busca configuração do Super Admin para receber o pagamento da assinatura
            const superAdmin: any = await User.findOne({ type: 'super_admin' })
                .select('global_payment_config gateway_provider')
                .lean();

            if (!superAdmin?.global_payment_config || !superAdmin?.gateway_provider) {
                req.errorStatus = 500;
                throw new Error('Configuração de pagamento global (Super Admin) não encontrada ou incompleta.');
            }

            // 4. Gerar external_reference único para o Mercado Pago: SUB_{subscriptionId}__{establishmentId}
            const externalReference = `SUB_${subscriptionId}__${establishmentId}`;

            // 5. Criar pagamento PIX no Mercado Pago
            const paymentData = {
                name: user.name, // Nome do usuário logado
                email: user.email, // Email do usuário logado
                amount: amount,
                cpf: req.body.cpf || '000.000.000-00', // CPF pode vir do body ou ser um placeholder
                external_reference: externalReference
            };

            // Unificamos a configuração injetando o provedor para que o Strategy Pattern funcione
            const paymentConfig = {
                ...superAdmin.global_payment_config,
                gateway_provider: superAdmin.gateway_provider
            };

            const gateway = PaymentProvider.getGateway(paymentConfig);
            const paymentResponse = await gateway.createPix(paymentData);

            // 6. Retornar os dados do PIX para o Angular (QR Code e Copia e Cola)
            return res.status(201).json(paymentResponse);
        } catch (e: any) {
            console.error('❌ [RENEW SUBSCRIPTION PIX ERROR]:', e.message);
            AuditService.log(req, {
                action: 'SUBSCRIPTION_RENEWAL_PIX_FAILED',
                module: 'SUBSCRIPTION',
                severity: 'error',
                details: { error: e.message, subscriptionId: subscriptionId, establishmentId: establishmentId }
            });
            next(e);
        }
    }
}
