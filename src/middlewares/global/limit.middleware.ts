import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
const Product = { schema: new mongoose.Schema({}, { strict: false }) };
const Item = { schema: new mongoose.Schema({}, { strict: false }) };
const Category = { schema: new mongoose.Schema({}, { strict: false }) };
import Banner from '../../models/banner.model';
import Establishment from '../../models/establishment.model';
import User from '../../models/user.model';

export class LimitMiddleware {
    static async checkProductLimit(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }
        const establishmentId = req.body.establishment_id || user.establishment_id;
        
        return LimitMiddleware.verifyLimit(req, res, next, {
            establishmentId,
            modelName: 'products',
            schema: Product.schema,
            limitKey: 'max_items',
            defaultLimit: 20,
            errorMessage: 'Limite de produtos do catálogo atingido'
        });
    }

    static async checkItemLimit(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }
        const establishmentId = req.body.establishment_id || user.establishment_id;
        
        return LimitMiddleware.verifyLimit(req, res, next, {
            establishmentId,
            modelName: 'items',
            schema: Item.schema,
            limitKey: 'max_items',
            defaultLimit: 20,
            errorMessage: 'Limite de produtos atingido'
        });
    }

    static async checkUserLimit(req: Request, res: Response, next: NextFunction) {
        const user = req.user;

        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }

        const establishmentId = req.body.establishment_id || user.establishment_id;

        if (user && user.type === 'super_admin') return next();

        try {
            const establishment: any = await Establishment.findById(String(establishmentId))
                .populate({ path: 'subscription_id', populate: { path: 'plan_id' }, strictPopulate: false });

            const currentCount = await User.countDocuments({ establishment_id: establishmentId });
            const limit = establishment?.subscription_id?.plan_id?.max_users || 1;

            if (currentCount >= limit) {
                req.errorStatus = 403;
                return next(new Error(`Limite de usuários atingido (${limit}). Faça um upgrade no seu plano.`));
            }

            next();
        } catch (e: any) {
            next(e);
        }
    }

    static async checkCategoryLimit(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }
        const establishmentId = req.body.establishment_id || user.establishment_id;
        
        return LimitMiddleware.verifyLimit(req, res, next, {
            establishmentId,
            modelName: 'categories',
            schema: Category.schema,
            limitKey: 'max_categories',
            defaultLimit: 10,
            errorMessage: 'Limite de categorias atingido'
        });
    }

    static async checkBannerLimit(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }
        const establishmentId = req.body.establishment_id || user.establishment_id;
        if (!establishmentId) return next(new Error('ID do estabelecimento é obrigatório'));

        if (user.type === 'super_admin') return next();

        try {
            const establishment: any = await Establishment.findById(String(establishmentId))
                .populate({ path: 'subscription_id', populate: { path: 'plan_id' }, strictPopulate: false });

            const maxAllowed = establishment?.subscription_id?.plan_id?.max_banners || 5;
            const planName = establishment?.subscription_id?.plan_id?.name?.toUpperCase() || 'DESCONHECIDO';

            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const monthlyCount = await Banner.countDocuments({
                establishment_id: establishmentId,
                created_at: { $gte: startOfMonth, $lte: endOfMonth }
            });

            if (monthlyCount >= maxAllowed) {
                req.errorStatus = 403;
                return next(new Error(
                    `Cota mensal de banners atingida para o plano ${planName} (${maxAllowed}). ` +
                    `Aguarde o próximo mês ou faça um upgrade.`
                ));
            }

            next();
        } catch (e: any) {
            next(e);
        }
    }

    static async checkActiveGlobalBannerLimit(req: Request, res: Response, next: NextFunction) {
        const user = req.user;

        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }

        const establishmentId = req.body.establishment_id || user.establishment_id;
        const isGlobal = req.body.is_global === 'true' || req.body.is_global === true;

        if (user.type === 'super_admin' || !isGlobal) return next();

        try {
            const establishment: any = await Establishment.findById(String(establishmentId))
                .populate({ path: 'subscription_id', populate: { path: 'plan_id' }, strictPopulate: false });

            const planName = establishment?.subscription_id?.plan_id?.name?.toLowerCase();

            if (planName === 'premium') {
                const activeGlobalCount = await Banner.countDocuments({
                    establishment_id: establishmentId,
                    is_global: true,
                    status: true,
                    expires_at: { $gt: new Date() }
                });

                if (activeGlobalCount >= 5) {
                    req.errorStatus = 403;
                    return next(new Error('Limite de 5 banners globais ativos atingido para o seu plano PREMIUM.'));
                }
            }
            next();
        } catch (e: any) {
            next(e);
        }
    }

    private static async verifyLimit(req: Request, res: Response, next: NextFunction, config: {
        establishmentId: any, modelName: string, schema: any, limitKey: string, defaultLimit: number, errorMessage: string
    }) {
        const user = req.user;
        if (user && user.type === 'super_admin') return next();
        
        let establishmentObjectId: mongoose.Types.ObjectId | undefined;
        if (config.establishmentId && mongoose.Types.ObjectId.isValid(String(config.establishmentId))) {
            establishmentObjectId = new mongoose.Types.ObjectId(String(config.establishmentId));
        }

        if (!establishmentObjectId) {
            return next(new Error('ID do estabelecimento é obrigatório para verificar limites.'));
        }

        try {
            const establishment: any = await Establishment.findById(String(config.establishmentId))
                .populate({ path: 'subscription_id', populate: { path: 'plan_id' }, strictPopulate: false });

            const Model = config.modelName === 'banners' ? Banner : req.db!.model(config.modelName, config.schema);
            const currentCount = await Model.countDocuments({ establishment_id: establishmentObjectId });

            const limit = establishment?.subscription_id?.plan_id?.[config.limitKey] || config.defaultLimit;

            if (currentCount >= limit) {
                req.errorStatus = 403;
                return next(new Error(`${config.errorMessage} (${limit}). Faça um upgrade no seu plano para continuar.`));
            }

            next();
        } catch (e: any) {
            next(e);
        }
    }
}
