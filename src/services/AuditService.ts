import SaaSAudit from '../models/audit.model';
import { Request } from 'express';
import { NotificationService } from './NotificationService';

export class AuditService {
    /**
     * Registra um evento de auditoria no banco central HubDB
     */
    static async log(
        req: Request | null,
        data: {
            action: string;
            module: string;
            severity?: 'info' | 'warn' | 'error' | 'critical';
            details?: any;
            user_id?: string;
            company_id?: string;
        }
    ) {
        try {
            const auditLog = new SaaSAudit({
                user_id: data.user_id || (req as any)?.user?.aud || (req as any)?.user?._id,
                company_id: data.company_id || req?.headers?.['x-company-id'] || (req as any)?.user?.company_id,
                action: data.action,
                module: data.module,
                severity: data.severity || 'info',
                details: data.details,
                path: req?.originalUrl || 'INTERNAL_SERVICE',
                method: req?.method || 'N/A',
                ip: req?.ip || '127.0.0.1'
            });
            await auditLog.save();

            // Se a severidade for crítica, envia um e-mail para o Super Admin
            if (auditLog.severity === 'critical') {
                await NotificationService.sendCriticalAlertEmailToSuperAdmin(auditLog.toObject());
                await NotificationService.sendCriticalAlertPushToSuperAdmins(auditLog.toObject());
            }
        } catch (e) {
            console.error('⚠️ [AuditService] Erro ao persistir log de auditoria:', e);
        }
    }
}
