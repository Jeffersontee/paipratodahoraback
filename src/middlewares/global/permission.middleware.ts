import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
const Item = { schema: new mongoose.Schema({}, { strict: false }) };
const Product = { schema: new mongoose.Schema({}, { strict: false }) };
import Banner from '../../models/banner.model';

export class PermissionMiddleware {
    static async canManageItem(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        const itemId = req.params.id;

        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }

        // Super Admin tem permissão total
        if (user && user.type === 'super_admin') {
            return next();
        }

        try {
            // Buscamos o item no banco ISOLADO da adega (injetado pelo resolveTenant)
            const ItemModel = req.db!.model('items', Item.schema);
            const item = await ItemModel.findById(itemId);
            
            if (!item) {
                req.errorStatus = 404;
                return next(new Error('Item não encontrado.'));
            }

            if (!user.establishment_id) {
                req.errorStatus = 403;
                return next(new Error('Acesso negado: Seu usuário não possui um estabelecimento vinculado.'));
            }

            // Verificamos se o estabelecimento do item é o mesmo do admin logado
            if (item.establishment_id.toString() !== user.establishment_id.toString()) {
                req.errorStatus = 403;
                return next(new Error('Acesso negado: Este produto pertence a outra adega.'));
            }

            next();
        } catch (e: any) {
            next(e);
        }
    }

    static async canManageProduct(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        const productId = req.params.id;

        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }

        if (user && user.type === 'super_admin') return next();

        try {
            const ProductModel = req.db!.model('products', Product.schema);
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                req.errorStatus = 404;
                return next(new Error('Produto não encontrado.'));
            }

            if (!user.establishment_id || product.establishment_id.toString() !== user.establishment_id.toString()) {
                req.errorStatus = 403;
                return next(new Error('Acesso negado: Este produto pertence a outra adega.'));
            }
            next();
        } catch (e: any) { next(e); }
    }

    static canCreateForEstablishment(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }
        const body_establishment_id = req.body.establishment_id;

        // Normalização de campos booleanos (evita CastError do Mongoose se vier string vazia do frontend)
        if (req.body && 'status' in req.body && req.body.status !== undefined) {
            const val = req.body.status;
            const isBoolLike = val === 'true' || val === 'false' || val === 'active' || val === 'inactive' || typeof val === 'boolean';
            
            if (isBoolLike) {
                req.body.status = val === 'true' || val === true || val === 'active';
            }
        }

        if (user.type === 'super_admin') {
            if (!body_establishment_id) {
                req.errorStatus = 400;
                return next(new Error('Para Super Admin, o campo establishment_id é obrigatório no corpo da requisição.'));
            }
            return next();
        }

        if (user.type === 'establishment_admin') {
            if (!user.establishment_id) {
                req.errorStatus = 403;
                return next(new Error('Acesso negado: Seu usuário não possui um estabelecimento vinculado.'));
            }

            req.body.establishment_id = user.establishment_id.toString();
            return next();
        }

        req.errorStatus = 403;
        next(new Error('Você não tem permissão para realizar esta operação.'));
    }

    static async canManageBanner(req: Request, res: Response, next: NextFunction) {
        const user = req.user;
        const bannerId = req.params.id;
        if (!bannerId) return next(new Error('ID do banner é obrigatório'));

        if (!user) {
            req.errorStatus = 401;
            return next(new Error('Usuário não autenticado.'));
        }

        if (user && user.type === 'super_admin') {
            return next();
        }

        try {
            const banner = await Banner.findById(bannerId);
            
            if (!banner) {
                req.errorStatus = 404;
                return next(new Error('Banner não encontrado.'));
            }

            if (!user.establishment_id) {
                req.errorStatus = 403;
                return next(new Error('Acesso negado: Seu usuário não possui um estabelecimento vinculado.'));
            }

            if (!banner.establishment_id || banner.establishment_id.toString() !== user.establishment_id.toString()) {
                req.errorStatus = 403;
                return next(new Error('Acesso negado: Este banner pertence a outra adega.'));
            }
            next();
        } catch (e: any) { next(e); }
    }
}
