import { Request, Response, NextFunction } from 'express';
import Subscription from '../models/subscription.model';
import Plan from '../models/plan.model';
import { AuditService } from '../services/AuditService';
import * as mongoose from 'mongoose';
import User from '../models/user.model';
import Company from '../models/company.model';
import { PaymentProvider } from '../services/PaymentProvider';

export class SubscriptionController {
    /**
     * Lista assinaturas. Super Admin vê todas, Lojista vê apenas as suas.
     */
    static async getSubscriptions(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user;
            const { plan, company_id } = req.query;
            let query: any = {};

            if (!user) {
                req.errorStatus = 401;
                throw new Error('Sessão inválida');
            }

            if (user.type === 'establishment_admin') {
                if (!user.company_id || !mongoose.Types.ObjectId.isValid(String(user.company_id))) {
                    req.errorStatus = 400;
                    throw new Error('ID do empresa inválido ou ausente no token do usuário.');
                }
                query.company_id = new mongoose.Types.ObjectId(String(user.company_id));
            }

            // Permite filtrar assinaturas de um empresa específico (Útil para o Super Admin)
            if (company_id) {
                query.company_id = company_id;
            }

            // Se um plano foi passado no filtro, buscamos o ID dele para filtrar as assinaturas
            if (plan) {
                const planDoc = await Plan.findOne({ name: { $regex: new RegExp(`^${plan}$`, 'i') } });
                if (planDoc) {
                    query.plan_id = planDoc._id;
                }
            }

            const subscriptions = await Subscription.find(query)
                .populate('company_id', 'res_name')
                .populate('plan_id', 'name price')
                .sort({ created_at: -1 })
                .lean();

            // Mapeia para o formato exato esperado pela interface Subscription do Frontend
            const formattedSubscriptions = subscriptions.map((sub: any) => ({
                id: sub._id,
                company_id: sub.company_id?._id || sub.company_id,
                company_name: sub.company_id?.res_name || 'N/A',
                plan_name: sub.plan_id?.name || 'Trial',
                amount: sub.price_at_subscription || sub.plan_id?.price || 0,
                status: (() => {
                    // Normaliza status para os tipos esperados pelo CSS do front
                    if (['active', 'trialing'].includes(sub.status)) return 'active';
                    if (['past_due', 'unpaid'].includes(sub.status)) return 'past_due';
                    return 'canceled';
                })(),
                current_period_end: sub.current_period_end
            }));

            return res.status(200).json({
                success: true,
                data: formattedSubscriptions
            });
        } catch (e) {
            next(e);
        }
    }

    static async getSubscriptionById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const user = req.user;

            if (!user) {
                req.errorStatus = 401;
                throw new Error('Não autorizado');
            }

            const subscription = await Subscription.findById(id)
                .populate('company_id', 'res_name')
                .populate('plan_id', 'name price')
                .lean();

            if (!subscription) throw new Error('Assinatura não encontrada');

            // Proteção: Lojista só vê sua própria assinatura
            if (
                user.type === 'establishment_admin' &&
                String((subscription.company_id as any)?._id) !== String(user.company_id)
            ) {
                req.errorStatus = 403;
                throw new Error('Acesso negado: Você não tem permissão para ver esta assinatura.');
            }

            return res.status(200).json({
                success: true,
                data: subscription
            });
        } catch (e) {
            next(e);
        }
    }

    static async createSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const sub = await new Subscription(req.body).save();

            AuditService.log(req, {
                action: 'SUBSCRIPTION_CREATED',
                module: 'SUBSCRIPTION',
                severity: 'info',
                details: { subscription_id: sub._id, company_id: sub.company_id }
            });

            return res.status(201).json(sub);
        } catch (e) {
            next(e);
        }
    }

    static async updateSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const updated = await Subscription.findByIdAndUpdate(
                id,
                { ...req.body, updated_at: new Date() },
                { new: true }
            );

            AuditService.log(req, {
                action: 'SUBSCRIPTION_UPDATED',
                module: 'SUBSCRIPTION',
                severity: 'info',
                details: { subscription_id: id, updates: req.body }
            });

            return res.status(200).json(updated);
        } catch (e) {
            next(e);
        }
    }

    static async upgradeSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { new_plan_id } = req.body;

            const plan = await Plan.findById(new_plan_id);
            if (!plan) throw new Error('Plano não encontrado');

            const subscription = await Subscription.findByIdAndUpdate(
                id,
                {
                    plan_id: new_plan_id,
                    price_at_subscription: plan.price,
                    updated_at: new Date()
                },
                { new: true }
            );

            AuditService.log(req, {
                action: 'SUBSCRIPTION_UPGRADED',
                module: 'SUBSCRIPTION',
                severity: 'info',
                details: { subscription_id: id, new_plan_id, price: plan.price }
            });

            return res.status(200).json(subscription);
        } catch (e) {
            next(e);
        }
    }

    static async downgradeSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { new_plan_id } = req.body;

            const plan = await Plan.findById(new_plan_id);
            if (!plan) throw new Error('Plano não encontrado');

            const subscription = await Subscription.findByIdAndUpdate(
                id,
                {
                    plan_id: new_plan_id,
                    price_at_subscription: plan.price,
                    updated_at: new Date()
                },
                { new: true }
            );

            AuditService.log(req, {
                action: 'SUBSCRIPTION_DOWNGRADED',
                module: 'SUBSCRIPTION',
                severity: 'info',
                details: { subscription_id: id, new_plan_id, price: plan.price }
            });

            return res.status(200).json(subscription);
        } catch (e) {
            next(e);
        }
    }

    static async cancelSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const subscription = await Subscription.findByIdAndUpdate(
                id,
                {
                    status: 'canceled',
                    cancel_at_period_end: true,
                    updated_at: new Date()
                },
                { new: true }
            );

            AuditService.log(req, {
                action: 'SUBSCRIPTION_CANCELLED',
                module: 'SUBSCRIPTION',
                severity: 'warn',
                details: { subscription_id: id }
            });

            return res.status(200).json(subscription);
        } catch (e) {
            next(e);
        }
    }

    static async deleteSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await Subscription.findByIdAndDelete(id);

            AuditService.log(req, {
                action: 'SUBSCRIPTION_DELETED',
                module: 'SUBSCRIPTION',
                severity: 'critical',
                details: { subscription_id: id }
            });

            return res.status(200).json({ success: true });
        } catch (e) {
            next(e);
        }
    }

    static async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user;
            if (!user) {
                req.errorStatus = 401;
                throw new Error('Usuário não autenticado');
            }

            const { planId, email, cpf, name } = req.body;
            if (!planId) {
                req.errorStatus = 400;
                throw new Error('ID do plano é obrigatório');
            }

            const plan = await Plan.findById(planId);
            if (!plan) {
                req.errorStatus = 404;
                throw new Error('Plano não encontrado');
            }

            const companyId = user.company_id;
            if (!companyId) {
                req.errorStatus = 400;
                throw new Error('ID do empresa não encontrado no token do usuário');
            }

            const company = await Company.findById(companyId);
            if (!company) {
                req.errorStatus = 404;
                throw new Error('Empresa não encontrado');
            }

            // Busca a assinatura existente ou cria uma nova
            let subscription: any = await Subscription.findOne({ company_id: companyId });
            const now = new Date();
            const trialEnd = new Date(now);
            trialEnd.setDate(trialEnd.getDate() + 30);

            if (!subscription) {
                const newSub = new Subscription({
                    company_id: companyId,
                    plan_id: planId,
                    status: plan.price === 0 ? 'trialing' : 'past_due',
                    price_at_subscription: plan.price,
                    current_period_start: now,
                    current_period_end: plan.price === 0 ? trialEnd : now
                });
                subscription = await newSub.save();
            }

            // Se o plano selecionado for gratuito (Trial / preço 0)
            if (plan.price === 0) {
                subscription.plan_id = plan._id;
                subscription.status = 'trialing';
                subscription.price_at_subscription = 0;
                subscription.current_period_end = trialEnd;
                subscription.updated_at = now;
                await subscription.save();

                await Company.findByIdAndUpdate(companyId, {
                    plan_id: plan._id,
                    plan_name: plan.name,
                    subscription_status: 'trialing',
                    next_payment_date: trialEnd
                });

                return res.status(200).json({
                    success: true,
                    message: 'Plano Trial ativado com sucesso!',
                    data: { subscription }
                });
            }

            // Caso seja plano pago (Lite, Pro, Premium):
            subscription.plan_id = plan._id;
            subscription.price_at_subscription = plan.price;
            subscription.updated_at = now;
            await subscription.save();

            // Busca as credenciais de pagamento do Super Admin para processar a cobrança do SaaS
            const superAdmin = await User.findOne({ type: 'super_admin' }).select('global_payment_config');
            if (!superAdmin || !superAdmin.global_payment_config) {
                req.errorStatus = 500;
                throw new Error('Configuração de pagamento global do sistema não encontrada.');
            }

            const gateway = PaymentProvider.getGateway(superAdmin.global_payment_config);
            const externalReference = `SUB_${subscription._id}__${companyId}`;

            console.log(`[SaaS Billing] Gerando PIX de R$ ${plan.price} para Estabelecimentos: ${company.short_name}`);

            const pixResponse = await gateway.createPix({
                name: name || user.name || company.name || 'Empresa',
                email: email || user.email || company.email,
                amount: plan.price,
                cpf: String(cpf || user.cpf || '').replace(/\D/g, '') || '00000000000',
                external_reference: externalReference,
                company_id: companyId
            });

            return res.status(200).json({
                success: true,
                message: 'Pagamento PIX da assinatura gerado com sucesso.',
                data: {
                    payment: pixResponse,
                    subscription
                }
            });
        } catch (e) {
            next(e);
        }
    }
}
