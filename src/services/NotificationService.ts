import { getMessaging, Message } from 'firebase-admin/messaging';
import mongoose from 'mongoose';
import User from '../models/user.model';
import Company from '../models/company.model';
import GlobalOrder from '../models/global.model';
import { NodeMailer } from './integrations/NodeMailer';
import { AuditService } from './AuditService';

export class NotificationService {
    // Interface interna para tipar usuários vindos do HubDB via .lean()
    private static async getUser(userId: string) {
        const UserModel = mongoose.connection.model('users', User.schema);
        return (await UserModel.findById(userId).lean()) as any;
    }

    private static async getSuperAdmins() {
        const UserModel = mongoose.connection.model('users', User.schema);
        return await UserModel.find({ type: 'super_admin', status: 'active' }).lean();
    }

    /**
     * Envia uma notificação Push via Firebase Cloud Messaging (FCM)
     * @param userId ID do usuário que receberá o push
     * @param status Novo status do pedido para gerar a mensagem
     * @param deliveryPerson Opcional: Nome do entregador
     */
    static async sendOrderStatusPush(userId: string, status: string, deliveryPerson?: string) {
        try {
            // GARANTIA: Busca o usuário sempre no Banco Central (HubDB)
            const user = await this.getUser(userId);

            if (!user || !user.fcm_token) {
                console.log(
                    `ℹ️ [NotificationService]: Push ignorado. Usuário ${user?.email || userId} não possui token FCM.`
                );

                // Tenta achar o company_id associado ao último pedido deste usuário
                let companyId = null;
                try {
                    const GlobalOrderModel = mongoose.connection.model('global_orders', GlobalOrder.schema);
                    const lastOrder = await GlobalOrderModel.findOne({ customer_id: userId })
                        .sort({ created_at: -1 })
                        .lean();
                    if (lastOrder) {
                        companyId = lastOrder.company_id;
                    }
                } catch (e) {
                    console.error('Erro ao buscar company_id para o push do cliente', e);
                }

                // AUDITORIA: Registra que o usuário está "cego" por falta de token
                await AuditService.log(null, {
                    action: 'PUSH_IGNORED_NO_TOKEN',
                    module: 'NOTIFICATION',
                    severity: 'warn',
                    details: { userId, order_status: status },
                    user_id: userId,
                    company_id: companyId ? String(companyId) : undefined
                });
                return; // Usuário não tem token registrado ou não existe
            }

            const pushBody = this.getStatusMessage(status, deliveryPerson);

            const message: Message = {
                notification: {
                    title: 'Status do Pedido',
                    body: pushBody
                },
                // Envia dados técnicos para o App processar em background/foreground
                data: {
                    type: 'ORDER_STATUS_UPDATED',
                    status: status
                },
                token: String(user.fcm_token)
            };

            await getMessaging().send(message);
            console.log(`✅ [NotificationService]: Push enviado para ${user.email} (Status: ${status})`);
        } catch (error: any) {
            console.error('⚠️ [NotificationService]: Erro ao enviar Push:', error);
            // AUDITORIA: Falha real na comunicação com o Firebase
            await AuditService.log(null, {
                action: 'PUSH_SEND_FAILED',
                module: 'NOTIFICATION',
                severity: 'error',
                details: { error: error.message, userId, status },
                user_id: userId
            });
        }
    }

    /**
     * Envia um alerta de estoque para o administrador do estabelecimento
     */
    static async sendLowStockAlert(companyId: string, itemName: string, currentStock: number) {
        try {
            // Busca no Banco Central
            const CompanyModel = mongoose.connection.model('companys', Company.schema);
            const UserModel = mongoose.connection.model('users', User.schema);

            const company: any = await CompanyModel.findById(companyId).lean();
            if (!company) return;

            const adminUser: any = await UserModel.findById((await mongoose.connection.model('users').findOne({company_id: company._id, type: 'company_owner'}))?._id).lean();
            if (!adminUser || !adminUser.fcm_token) return;

            const message: Message = {
                notification: {
                    title: 'Alerta de Estoque! ⚠️',
                    body:
                        currentStock <= 0
                            ? `O item "${itemName}" ESGOTOU! Reponha o estoque para continuar vendendo.`
                            : `O item "${itemName}" está acabando (Restam apenas ${currentStock}). Reponha em breve!`
                },
                token: String(adminUser.fcm_token)
            };

            await getMessaging().send(message);
            console.log(`✅ [NotificationService]: Alerta de estoque enviado para admin ${adminUser.email}`);
        } catch (error) {
            console.error('⚠️ [NotificationService]: Erro ao enviar alerta de estoque:', error);
        }
    }

    /**
     * Envia um push para o dono da adega avisando sobre a expiração de um banner.
     */
    static async sendBannerExpiryPush(companyId: string, bannerId: string) {
        try {
            if (!companyId) {
                throw new Error('ID do estabelecimento é obrigatório para enviar push de expiração de banner.');
            }
            const est = await Company.findById(companyId).lean();
            if (!est) return;

            // Busca o usuário admin do estabelecimento para pegar o fcm_token
            const user = await this.getUser(String((await mongoose.connection.model('users').findOne({company_id: est._id, type: 'company_owner'}))?._id));
            if (!user || !user.fcm_token) return;

            console.log(`📡 [FCM]: Usando token para ${user.email}: ${user.fcm_token.substring(0, 15)}...`);

            const message: Message = {
                notification: {
                    title: 'Banner Expirando! 🧊',
                    body: `O seu banner do estabelecimento "${est.name}" expira em 24h. Renove agora para manter sua visibilidade!`
                },
                token: String(user.fcm_token),
                data: {
                    type: 'BANNER_EXPIRY',
                    banner_id: bannerId.toString(),
                    click_action: 'FLUTTER_NOTIFICATION_CLICK' // Opcional para apps híbridos
                }
            };

            await getMessaging().send(message);
            console.log(`✅ Push de expiração enviado para o lojista: ${user.email}`);

            // Registro de auditoria em caso de sucesso
            await AuditService.log(null, {
                action: 'BANNER_EXPIRY_NOTIFICATION_SENT',
                module: 'BANNER',
                severity: 'info',
                details: { banner_id: bannerId, email: user.email },
                user_id: user._id.toString(),
                company_id: companyId
            });
        } catch (error: any) {
            console.error('❌ Erro ao enviar push de expiração:', error);
            // Registro de auditoria em caso de falha técnica no Firebase
            await AuditService.log(null, {
                action: 'BANNER_EXPIRY_NOTIFICATION_FAILED',
                module: 'BANNER',
                severity: 'error',
                details: { error: error.message, banner_id: bannerId },
                company_id: companyId
            });
        }
    }

    /**
     * Notifica o lojista sobre falhas críticas na renovação do token de pagamento.
     */
    static async sendPaymentProviderErrorPush(companyId: string, providerName: string) {
        try {
            const CompanyModel = mongoose.connection.model('companys', Company.schema);
            const company: any = await CompanyModel.findById(companyId).lean();
            if (!company) return;

            const user = await this.getUser(String((await mongoose.connection.model('users').findOne({company_id: company._id, type: 'company_owner'}))?._id));
            if (!user || !user.fcm_token) return;

            const message: Message = {
                notification: {
                    title: 'Ação Necessária: Pagamentos ⚠️',
                    body: `A conexão com o ${providerName} expirou e não pôde ser renovada. Reautorize sua conta para continuar recebendo pagamentos.`
                },
                data: {
                    type: 'PAYMENT_AUTH_REQUIRED',
                    provider: providerName
                },
                token: String(user.fcm_token)
            };

            await getMessaging().send(message);

            await AuditService.log(null, {
                action: 'PAYMENT_REFRESH_NOTIFICATION_SENT',
                module: 'PAYMENT',
                severity: 'warn',
                details: { companyId, provider: providerName },
                company_id: companyId
            });
        } catch (error) {
            console.error('⚠️ [NotificationService]: Erro ao enviar push de falha de pagamento:', error);
        }
    }

    private static getStatusMessage(status: string, deliveryPerson?: string): string {
        if (status === 'shipped') {
            return `O entregador ${deliveryPerson || 'da Casa'} já está a caminho! 🛵`;
        }

        const msgs: any = {
            preparing: 'Oba! Seu pedido já está sendo preparado! 👨‍🍳',
            delivered: 'Pedido entregue. Aproveite com moderação! 😋',
            cancelled: 'Infelizmente seu pedido foi cancelado. 😕'
        };

        return msgs[status] || 'Seu pedido foi atualizado.';
    }

    /**
     * Envia um e-mail de alerta crítico para todos os Super Admins.
     * @param logDetails Detalhes do log de auditoria crítico.
     */
    static async sendCriticalAlertEmailToSuperAdmin(logDetails: any) {
        try {
            const superAdmins = await this.getSuperAdmins();
            if (superAdmins.length === 0) {
                console.warn(
                    '⚠️ [NotificationService]: Nenhum Super Admin ativo encontrado para enviar alerta crítico.'
                );
                return;
            }

            const adminEmails = superAdmins.map((admin) => admin.email);

            const htmlContent = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #f00; padding: 20px; border-radius: 10px; background-color: #ffebeb;">
                    <h1 style="color: #d9534f; text-align: center;">🚨 ALERTA CRÍTICO DE SEGURANÇA 🚨</h1>
                    <p>Prezado Super Admin,</p>
                    <p>Foi detectado um evento de severidade <strong>CRÍTICA</strong> no sistema Estabelecimento Pinguins.</p>
                    
                    <div style="background: #fff; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcc;">
                        <h3 style="margin-top: 0; color: #d9534f;">Detalhes do Incidente:</h3>
                        <p><strong>Ação:</strong> ${logDetails.action}</p>
                        <p><strong>Módulo:</strong> ${logDetails.module}</p>
                        <p><strong>Severidade:</strong> ${logDetails.severity.toUpperCase()}</p>
                        <p><strong>Usuário ID:</strong> ${logDetails.user_id || 'N/A'}</p>
                        <p><strong>Estabelecimento ID:</strong> ${logDetails.company_id || 'N/A'}</p>
                        <p><strong>IP:</strong> ${logDetails.ip || 'N/A'}</p>
                        <p><strong>Detalhes:</strong> <pre style="background: #eee; padding: 10px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(logDetails.details, null, 2)}</pre></p>
                        <p><strong>Timestamp:</strong> ${new Date(logDetails.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    </div>

                    <p style="text-align: center; color: #777; font-size: 0.9em;">Por favor, investigue este incidente imediatamente.</p>
                </div>
            `;

            await NodeMailer.sendMail({
                to: adminEmails,
                subject: `[ALERTA CRÍTICO] Incidente de Segurança - ${logDetails.action}`,
                html: htmlContent
            });
            console.log(
                `✅ [NotificationService]: Alerta crítico enviado para Super Admins: ${adminEmails.join(', ')}`
            );
        } catch (error) {
            console.error('❌ Erro ao enviar e-mail de alerta crítico:', error);
        }
    }

    /**
     * Envia uma notificação Push sobre uma fatura em atraso.
     * @param companyId ID do estabelecimento
     * @param amount Valor da fatura
     * @param daysOverdue Quantidade de dias em atraso
     */
    static async sendInvoiceOverduePush(companyId: string, amount: number, daysOverdue: number) {
        try {
            const CompanyModel = mongoose.connection.model('companys', Company.schema);
            const UserModel = mongoose.connection.model('users', User.schema);

            const company: any = await CompanyModel.findById(companyId).lean();
            if (!company) return;

            const adminUser: any = await UserModel.findById((await mongoose.connection.model('users').findOne({company_id: company._id, type: 'company_owner'}))?._id).lean();
            if (!adminUser || !adminUser.fcm_token) return;

            const message: Message = {
                notification: {
                    title: 'Fatura em Atraso! ⚠️',
                    body: `A mensalidade de R$ ${amount.toFixed(2)} do seu estabelecimento "${company.name}" está atrasada há ${daysOverdue} dias. Por favor, regularize para evitar suspensão.`
                },
                data: {
                    type: 'INVOICE_OVERDUE',
                    amount: String(amount),
                    days_overdue: String(daysOverdue)
                },
                token: String(adminUser.fcm_token)
            };

            await getMessaging().send(message);
            console.log(`✅ [NotificationService]: Alerta de atraso enviado para o lojista ${adminUser.email}`);
        } catch (error) {
            console.error('⚠️ [NotificationService]: Erro ao enviar push de fatura atrasada:', error);
        }
    }

    /**
     * Envia push de alertas críticos para todos os super admins ativos.
     */
    static async sendCriticalAlertPushToSuperAdmins(log: any) {
        try {
            const superAdmins = await this.getSuperAdmins();
            const tokens = superAdmins.map((admin: any) => admin.fcm_token).filter(Boolean);

            if (tokens.length === 0) {
                console.log(
                    'ℹ️ [NotificationService]: Push de alerta crítico ignorado. Nenhum Super Admin tem token FCM.'
                );
                return;
            }

            const message = {
                notification: {
                    title: '🚨 ALERTA CRÍTICO DE SISTEMA',
                    body: `Incidente registrado: ${log.action || 'Sem descrição'}. Verifique o painel imediatamente.`
                },
                data: {
                    type: 'CRITICAL_AUDIT_LOG',
                    log_id: String(log._id)
                }
            };

            // Envia multicast se houver múltiplos tokens
            if (tokens.length > 0) {
                const response = await getMessaging().sendEachForMulticast({
                    tokens: tokens.map(String),
                    notification: message.notification,
                    data: message.data
                });
                console.log(
                    `✅ [NotificationService]: Push de alerta crítico enviado para ${response.successCount} Super Admins.`
                );
            }
        } catch (error) {
            console.error('⚠️ [NotificationService]: Erro ao enviar push de alerta crítico para Super Admins:', error);
        }
    }
}
