import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
//import GlobalOrder from '../../models/GlobalOrder';
import Establishment from '../../models/establishment.model';
import { Redis } from '../../utils/Redis';
//import { TenantManager } from '../../utils/TenantManager';

export class TenantMiddleware {
    /**
     * Middleware para resolver qual banco de dados usar
     */
    static async resolveTenant(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user;

            // Tenta capturar o ID de todas as fontes possíveis, incluindo params da URL
            let establishmentId =
                req.headers['x-establishment-id'] ||
                req.params.establishmentId ||
                req.query.establishment_id ||
                req.body?.establishment_id;

            // Se não achou o ID mas tem um orderId nos params ou body,
            // busca no Índice Global (HubDB) para saber qual é o tenant.
            const orderId = req.params.orderId || req.params.id || req.body.order_id;
            if (!establishmentId && orderId && mongoose.Types.ObjectId.isValid(String(orderId))) {
                //const gOrder = await GlobalOrder.findOne({
                //  $or: [{ tenant_order_id: orderId }, { _id: orderId }]
                //}).lean();
                //if (gOrder) {
                //  establishmentId = gOrder.establishment_id.toString();
                // (req as any).globalOrder = gOrder; // Anexa o mapeamento para uso no controller
                //}
            }

            // Tenta extrair do external_reference se vier do Mercado Pago (Segurança extra para pagamentos)
            if (!establishmentId && req.body?.external_reference) {
                const parts = String(req.body.external_reference).split('__');
                if (parts.length > 1) establishmentId = parts[1];
            }

            // Se for um lojista ou staff, o ID vem do perfil do usuário para segurança
            if (!establishmentId && user && (user.type === 'establishment_admin' || user.type === 'staff')) {
                establishmentId = user.establishment_id;
            }

            if (!establishmentId) {
                // REGRA DE NEGÓCIO: Se a rota exige um tenant (ex: /orders/:orderId/repeat-details)
                // e não conseguimos identificar o establishmentId, é um erro.
                if (
                    req.originalUrl.includes('/orders/') ||
                    req.originalUrl.includes('/items/') ||
                    req.originalUrl.includes('/categories/')
                ) {
                    console.error(
                        `❌ [ResolveTenant Error]: Não foi possível identificar o estabelecimento para a rota ${req.originalUrl}.`
                    );
                    return res.status(400).json({
                        message:
                            'Não foi possível identificar o estabelecimento para esta operação. Verifique o ID do pedido ou do estabelecimento.'
                    });
                } else {
                    // Fallback para o banco central se nenhum tenant for identificado para rotas globais
                    req.db = mongoose.connection;
                    return next();
                }
            }

            // PERFORMANCE: Tenta buscar o db_name no Redis antes de consultar o MongoDB
            const cacheKey = `tenant_db:${establishmentId}`;
            let establishmentData = await Redis.getValue(cacheKey);
            let establishment: any;

            if (establishmentData) {
                establishment = JSON.parse(establishmentData);
            } else {
                establishment = await Establishment.findById(String(establishmentId)).lean();
                if (establishment) {
                    // Cacheia por 1 hora para evitar lookups constantes no HubDB
                    await Redis.setValue(cacheKey, JSON.stringify(establishment), 3600);
                }
            }

            if (!establishment) {
                return res.status(404).json({ message: 'Estabelecimento não encontrado.' });
            }

            // Obtém a conexão isolada
            //const tenantConn = await TenantManager.getTenantConnection(establishment.db_name);
            console.log(`📡 [ResolveTenant] Conectado ao TenantDB: ${establishment.db_name}`);
            req.establishment = establishment; // Garante que os dados da adega sigam para o controller

            // Anexa a conexão ao req para os controllers usarem
            // req.db = tenantConn;
            next();
        } catch (e: any) {
            return res.status(403).json({ message: 'Erro ao resolver base de dados.', error: e?.message || e });
        }
    }
}
