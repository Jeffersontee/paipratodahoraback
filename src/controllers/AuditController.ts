import { Request, Response, NextFunction } from 'express';
import SaaSAudit from '../models/Audit.model';

export class AuditController {
    /**
     * Lista os logs de auditoria com paginação e filtros
     */
    static async getLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const perPage = 20;
            const page = parseInt(req.query.page as string) || 1;
            const { severity, module, company_id } = req.query;

            let query: any = {};
            if (!req.user) throw new Error('Acesso negado');
            // Filtros dinâmicos
            if (severity) query.severity = severity;
            if (module) query.module = module;

            // Se não for super_admin, ele só vê os logs do próprio estabelecimento
            if (req.user.type === 'company_owner') {
                query.company_id = req.user.company_id;
            } else if (company_id) {
                query.company_id = company_id;
            }

            const count = await SaaSAudit.countDocuments(query);
            const logs = await SaaSAudit.find(query)
                .sort({ created_at: -1 })
                .skip(perPage * page - perPage)
                .limit(perPage)
                .populate('user_id', 'name email')
                .populate('company_id', 'res_name')
                .lean();

            return res.status(200).json({
                data: logs,
                total: count,
                page,
                totalPages: Math.ceil(count / perPage)
            });
        } catch (e) {
            next(e);
        }
    }

    /**
     * Retorna os logs críticos em formato JSON para o Dashboard
     */
    static async getCriticalLogs(req: Request, res: Response, next: NextFunction) {
        try {
            let query: any = { severity: 'critical' };
            if (!req.user) throw new Error('Acesso negado');
            // Respeita o isolamento de dados do lojista
            if (req.user.type === 'company_owner') {
                query.company_id = req.user.company_id;
            }

            // Busca os 50 logs críticos mais recentes
            const logs = await SaaSAudit.find(query)
                .sort({ created_at: -1 })
                .limit(50)
                .populate('user_id', 'name email')
                .populate('company_id', 'res_name')
                .lean();

            // Retorna JSON para que o Angular consiga parsear corretamente
            return res.status(200).json(logs);
        } catch (e) {
            next(e);
        }
    }

    /**
     * Exporta os logs de auditoria para um arquivo CSV
     */
    static async exportLogsToCSV(req: Request, res: Response, next: NextFunction) {
        try {
            const { severity, module, company_id } = req.query;

            let query: any = {};
            if (!req.user) throw new Error('Acesso negado');
            if (severity) query.severity = severity;
            if (module) query.module = module;

            if (req.user.type === 'company_owner') {
                query.company_id = req.user.company_id;
            } else if (company_id) {
                query.company_id = company_id;
            }

            // Busca todos os logs filtrados (sem paginação para o export)
            const logs = await SaaSAudit.find(query)
                .sort({ created_at: -1 })
                .populate('user_id', 'name email')
                .populate('company_id', 'res_name')
                .lean();

            // Definição das colunas e mapeamento dos dados
            const header = ['Data', 'Modulo', 'Acao', 'Severidade', 'Usuario', 'Estabelecimento', 'IP', 'Detalhes'];
            const rows = logs.map((log) => [
                new Date(log.created_at).toLocaleString('pt-BR'),
                log.module,
                log.action,
                log.severity,
                (log.user_id as any)?.email || 'N/A',
                (log.company_id as any)?.res_name || 'Sistema',
                log.ip || 'N/A',
                JSON.stringify(log.details || {}).replace(/"/g, '""') // Escapa aspas para o CSV
            ]);

            // Adiciona BOM (\ufeff) para o Excel reconhecer caracteres UTF-8 corretamente
            const csvContent =
                '\ufeff' +
                [header.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);

            return res.status(200).send(csvContent);
        } catch (e) {
            next(e);
        }
    }
}
