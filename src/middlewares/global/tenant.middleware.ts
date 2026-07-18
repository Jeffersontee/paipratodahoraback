import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
//import GlobalOrder from '../../models/GlobalOrder';
import Company from '../../models/company.model';
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
            let companyId =
                req.headers['x-company-id'] ||
                req.params.companyId ||
                req.query.company_id ||
                req.body?.company_id;

            // Se não achou o ID mas tem um orderId nos params ou body,
            // busca no Índice Global (HubDB) para saber qual é o tenant.
            const orderId = req.params.orderId || req.params.id || req.body.order_id;
            if (!companyId && orderId && mongoose.Types.ObjectId.isValid(String(orderId))) {
                //const gOrder = await GlobalOrder.findOne({
                //  $or: [{ tenant_order_id: orderId }, { _id: orderId }]
                //}).lean();
                //if (gOrder) {
                //  companyId = gOrder.company_id.toString();
                // (req as any).globalOrder = gOrder; // Anexa o mapeamento para uso no controller
                //}
            }

            // Tenta extrair do external_reference se vier do Mercado Pago (Segurança extra para pagamentos)
            if (!companyId && req.body?.external_reference) {
                const parts = String(req.body.external_reference).split('__');
                if (parts.length > 1) companyId = parts[1];
            }

            // Se for um lojista ou staff, o ID vem do perfil do usuário para segurança
            if (!companyId && user && (user.type === 'company_owner' || user.type === 'staff')) {
                companyId = user.company_id;
            }

            if (!companyId) {
                // REGRA DE NEGÓCIO: Se a rota exige um tenant (ex: /orders/:orderId/repeat-details)
                // e não conseguimos identificar o companyId, é um erro.
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
            const cacheKey = `tenant_db:${companyId}`;
            let companyData = await Redis.getValue(cacheKey);
            let company: any;

            if (companyData) {
                company = JSON.parse(companyData);
            } else {
                company = await Company.findById(String(companyId)).lean();
                if (company) {
                    // Cacheia por 1 hora para evitar lookups constantes no HubDB
                    await Redis.setValue(cacheKey, JSON.stringify(company), 3600);
                }
            }

            if (!company) {
                return res.status(404).json({ message: 'Estabelecimento não encontrado.' });
            }

            // Obtém a conexão isolada
            //const tenantConn = await TenantManager.getTenantConnection(company.db_name);
            console.log(`📡 [ResolveTenant] Conectado ao TenantDB: ${company.db_name}`);
            req.company = company; // Garante que os dados da adega sigam para o controller

            // Anexa a conexão ao req para os controllers usarem
            // req.db = tenantConn;
            next();
        } catch (e: any) {
            return res.status(403).json({ message: 'Erro ao resolver base de dados.', error: e?.message || e });
        }
    }
}
