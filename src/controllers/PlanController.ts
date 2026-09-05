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
            let plans = await Plan.find().lean();

            if (plans.length === 0) {
                const defaultPlans = [
                    {
                        name: 'Trial (Degustação)',
                        price: 0,
                        billing_cycle: 'monthly',
                        max_services: 3,
                        max_units: 1,
                        max_users: 1,
                        catalog_module_enabled: true,
                        description: 'Plano gratuito de avaliação com recursos básicos.',
                        status: 'active',
                        features: ['Até 3 serviços no catálogo', '1 filial / unidade', '1 usuário de acesso']
                    },
                    {
                        name: 'Bronze (Básico)',
                        price: 99.90,
                        billing_cycle: 'monthly',
                        max_services: 5,
                        max_units: 1,
                        max_users: 2,
                        catalog_module_enabled: true,
                        description: 'Ideal para prestadores individuais e pequenas empresas.',
                        status: 'active',
                        features: ['Até 5 serviços no catálogo', '1 filial', '2 usuários', 'Agenda 365']
                    },
                    {
                        name: 'Prata (Profissional)',
                        price: 199.90,
                        billing_cycle: 'monthly',
                        max_services: 20,
                        max_units: 5,
                        max_users: 10,
                        catalog_module_enabled: true,
                        description: 'Para empresas em expansão com múltiplos técnicos.',
                        status: 'active',
                        features: ['Até 20 serviços no catálogo', '5 filiais', '10 usuários', 'Agenda e Ordens de Serviço', 'Módulo Catálogo']
                    },
                    {
                        name: 'Ouro (Corporativo)',
                        price: 349.90,
                        billing_cycle: 'monthly',
                        max_services: 100,
                        max_units: 20,
                        max_users: 50,
                        catalog_module_enabled: true,
                        description: 'Plano corporativo completo sem restrições.',
                        status: 'active',
                        features: ['Catálogo ilimitado', '20 filiais', '50 usuários', 'Suporte VIP']
                    }
                ];
                await Plan.insertMany(defaultPlans);
                plans = await Plan.find().lean();
            }

            // Para cada plano, busca os estabelecimentos vinculados (No Banco Central HubDB)
            const plansWithEstablishments = await Promise.all(
                plans.map(async (plan) => {
                    const activeSubscriptions = await Subscription.find({
                        plan_id: plan._id,
                        status: 'active'
                    })
                        .populate('company_id', 'name active')
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

            // Validação de Segurança: Bloqueia a remoção se houver assinaturas vinculadas a este plano
            const hasLinkedSubscriptions = await Subscription.exists({ plan_id: planId });
            if (hasLinkedSubscriptions) {
                req.errorStatus = 400;
                throw new Error('Não é possível excluir um plano que possui estabelecimentos com assinaturas vinculadas.');
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
        let companyId = req.body.company_id; // For Super Admin

        try {
            if (!subscriptionId) {
                req.errorStatus = 400;
                throw new Error('ID da assinatura é obrigatório.');
            }

            // 1. Validar permissão e obter o company_id correto
            if (user.type === 'company_owner' || user.type === 'admin') {
                if (!user.company_id) {
                    req.errorStatus = 403;
                    throw new Error('Acesso negado: Seu usuário não possui uma empresa vinculada.');
                }
                companyId = user.company_id;
            } else if (user.type === 'super_admin') {
                if (!companyId) {
                    req.errorStatus = 400;
                    throw new Error('Para Super Admin, o campo company_id é obrigatório no corpo da requisição.');
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

            // 3. Verificar se a assinatura pertence à empresa correta (segurança)
            if (String(subscription.company_id) !== String(companyId)) {
                req.errorStatus = 403;
                throw new Error('Acesso negado: Esta assinatura não pertence à sua empresa.');
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

            // 4. Gerar external_reference único para o Mercado Pago: SUB_{subscriptionId}__{companyId}
            const externalReference = `SUB_${subscriptionId}__${companyId}`;

            // 5. Criar pagamento PIX no Mercado Pago
            const paymentData = {
                name: user.name,
                email: user.email,
                amount: amount,
                cpf: req.body.cpf || '000.000.000-00',
                external_reference: externalReference
            };

            const paymentConfig = {
                ...superAdmin.global_payment_config,
                gateway_provider: superAdmin.gateway_provider
            };

            const gateway = PaymentProvider.getGateway(paymentConfig);
            const paymentResponse = await gateway.createPix(paymentData);

            return res.status(201).json(paymentResponse);
        } catch (e: any) {
            console.error('❌ [RENEW SUBSCRIPTION PIX ERROR]:', e.message);
            AuditService.log(req, {
                action: 'SUBSCRIPTION_RENEWAL_PIX_FAILED',
                module: 'SUBSCRIPTION',
                severity: 'error',
                details: { error: e.message, subscriptionId: subscriptionId, companyId: companyId }
            });
            next(e);
        }
    }
}
