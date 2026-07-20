import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago';
import { IPaymentGateway, WebhookResult } from '../PaymentProvider';
import { Utils } from '../../utils/Utils';
import mongoose from 'mongoose';

/**
 * Helper para garantir que a URL de notificação nunca seja 'undefined'
 * O Mercado Pago rejeita automaticamente localhost ou IPs internos na API de Produção.
 */
const getNotificationUrl = (companyId?: string): string | undefined => {
    const uri = Utils.getEnvVar('HEROKU_URI') || Utils.getEnvVar('FRONTEND_URL');
    if (!uri || uri.includes('localhost') || uri.includes('127.0.0.1')) {
        return undefined;
    }
    const query = companyId ? `?company_id=${companyId}` : '';
    return `${uri}/api/payments/webhook${query}`;
};

export class MercadoPago implements IPaymentGateway {
    private _client: MercadoPagoConfig;

    constructor(accessToken: string) {
        this._client = MercadoPago.createMercadoPagoClient(accessToken);
    }

    /**
     * Cria uma instância de MercadoPagoConfig com o accessToken fornecido (Segurança Multi-Tenant).
     */
    private static createMercadoPagoClient(accessToken: string): MercadoPagoConfig {
        return new MercadoPagoConfig({
            accessToken: accessToken,
            options: { timeout: 10000 }
        });
    }

    /**
     * Retorna uma instância do cliente Mercado Pago com as credenciais master da Plataforma.
     */
    public static getPlatformClient(): MercadoPagoConfig {
        const platformAccessToken = Utils.getEnvVar('MERCADOPAGO_ACCESS_TOKEN');
        if (!platformAccessToken) {
            throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado para o ambiente atual.');
        }
        return MercadoPago.createMercadoPagoClient(platformAccessToken);
    }

    // ==========================================
    // 🎯 MÉTODOS DE ASSINATURA DA INTERFACE (GATEWAY)
    // ==========================================

    async createPix(data: any): Promise<any> {
        return MercadoPago.createPixPayment(data, this._client);
    }

    async createCard(data: any): Promise<any> {
        return MercadoPago.createPayment(data, this._client);
    }

    // ==========================================
    // ⚙️ MÉTODOS ESTÁTICOS INTERNOS E SANITIZAÇÃO
    // ==========================================

    static async createPixPayment(data: any, clientInstance?: MercadoPagoConfig) {
        const mpClient = clientInstance || MercadoPago.getPlatformClient();
        const payment = new Payment(mpClient);

        if (!data.email) {
            console.error('❌ [PIX_ERROR]: Tentativa de gerar PIX sem e-mail do pagador.');
            throw new Error('E-mail do pagador é obrigatório para gerar PIX.');
        }

        const externalReference = String(data.external_reference || data.order_id || 'PIX_REF');
        const sanitizeName = (val: any) =>
            String(val || '')
                .replace(/[0-9]/g, '')
                .trim();
        const fullName = sanitizeName(data.name);

        const body: any = {
            transaction_amount: data.amount,
            description: `Pedido - ${data.email}`,
            payment_method_id: 'pix',
            payer: {
                email: data.email,
                first_name: fullName.split(' ')[0] || 'Cliente',
                last_name: fullName.split(' ').slice(1).join(' ') || 'Pinguins',
                identification: {
                    type: 'CPF',
                    number: String(data.cpf || '').replace(/\D/g, '')
                }
            },
            external_reference: externalReference,
            additional_info: {
                items: (data.items || [])?.map((item: any) => ({
                    id: String(item._id || item.id || 'item'),
                    title: item.name || item.title || 'Produto Adega',
                    description: item.description || item.name || 'Pedido Estabelecimento',
                    category_id: String(item.category_id || 'others'),
                    quantity: Number(item.quantity || 1),
                    unit_price: Number(item.price || item.unit_price || data.amount)
                }))
            }
        };

        const notificationUrl = getNotificationUrl(data.company_id);
        if (notificationUrl) {
            body.notification_url = notificationUrl;
        }

        try {
            const result = (await MercadoPago.retryMercadoPagoRequest(() =>
                payment.create({
                    body,
                    requestOptions: { idempotencyKey: externalReference + '_pix', timeout: 10000 }
                })
            )) as any;

            return {
                id: result.id,
                status: result.status,
                qr_code: result.point_of_interaction?.transaction_data?.qr_code,
                qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
                ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
            };
        } catch (error) {
            console.error('Erro Mercado Pago (PIX):', error);
            throw error;
        }
    }

    static async createPayment(data: any, clientInstance?: MercadoPagoConfig) {
        const mpClient = clientInstance || MercadoPago.getPlatformClient();
        const payment = new Payment(mpClient);

        const rawAmount = data.transaction_amount || data.amount || data.formData?.transaction_amount;
        const amount = Number(rawAmount);
        const email = data.email || data.payer?.email || data.formData?.payer?.email;
        const externalReference = String(data.external_reference || data.formData?.external_reference || 'ID_FALTOU');

        console.log(`💳 [createPayment]: Processando para ${email} | Valor: ${amount}`);

        if (isNaN(amount) || amount <= 0) {
            throw new Error(`Valor da transação (${amount}) é inválido ou não foi informado.`);
        }

        if (!email) {
            console.error('ERRO: Payload recebido sem e-mail:', JSON.stringify(data, null, 2));
            throw new Error('E-mail do pagador é obrigatório');
        }

        const sanitizeName = (val: any) =>
            String(val || '')
                .replace(/[0-9]/g, '')
                .trim();

        const firstName =
            sanitizeName(data.payer?.first_name || data.formData?.payer?.first_name || data.payer?.firstName) ||
            'Cliente';
        const lastName =
            sanitizeName(data.payer?.last_name || data.formData?.payer?.last_name || data.payer?.lastName) ||
            'Pinguins';

        const rawToken = data.token || data.formData?.token;
        const token = rawToken ? String(rawToken).trim() : '';
        const shouldSendToken = token && token.toUpperCase() !== 'MISSING';

        const body: any = {
            transaction_amount: amount,
            ...(shouldSendToken ? { token } : {}),
            description: data.description || data.formData?.description || 'Pedido Estabelecimento',
            payment_method_id: data.payment_method_id || data.formData?.payment_method_id,
            issuer_id: data.issuer_id || data.formData?.issuer_id,
            external_reference: externalReference,
            installments: Number(data.installments || data.formData?.installments || 1),
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: data.payer?.identification?.type || data.formData?.payer?.identification?.type || 'CPF',
                    number: String(
                        data.payer?.identification?.number || data.formData?.payer?.identification?.number || ''
                    ).replace(/\D/g, '')
                }
            },
            additional_info: {
                items: (data.order || data.items || data.formData?.order || [])?.map((item: any) => ({
                    id: String(item._id || item.id || 'item'),
                    title: item.name || item.title || 'Produto Adega',
                    description: item.description || item.name || 'Pedido Estabelecimento',
                    category_id: String(item.category_id || 'others'),
                    quantity: Number(item.quantity || 1),
                    unit_price: Number(item.price || item.unit_price || amount)
                }))
            }
        };

        const notificationUrl = getNotificationUrl(data.company_id);
        if (notificationUrl) {
            body.notification_url = notificationUrl;
        }

        const logBody = { ...body };
        if (logBody.token) logBody.token = 'PRESENT';
        if (logBody.payer?.identification?.number) {
            logBody.payer.identification.number = '***' + String(logBody.payer.identification.number).slice(-3);
        }
        console.log('🚀 [MP SEND BODY]:', JSON.stringify(logBody, null, 2));

        try {
            const idempotencyKey = externalReference !== 'ID_FALTOU' ? externalReference : `MP_${Date.now()}`;
            const result = await MercadoPago.retryMercadoPagoRequest(() =>
                payment.create({
                    body,
                    requestOptions: { idempotencyKey, timeout: 10000 }
                })
            );
            return result;
        } catch (error) {
            console.error('Erro no processamento do Mercado Pago (Card):', error);
            throw error;
        }
    }
    // ==========================================
    // 🔄 WEBHOOKS E REQUISIÇÕES DE RETORNO
    // ==========================================

    async handleWebhook(body: any, query?: any, headers?: any): Promise<WebhookResult | null> {
        const resourceId = query['data.id'] || query.id || body.data?.id || body.resource?.id;
        const topic = (query.type || query.topic || body.type || body.action || '').toString();

        if (!resourceId || resourceId === '123456') return null;

        if (topic.includes('payment')) {
            const paymentInstance = new Payment(this._client);
            const result = await paymentInstance.get({ id: String(resourceId) });

            if (result.status === 'approved') {
                const extRef = result.external_reference;
                if (!extRef) return null;

                const parts = extRef.split('__');
                let entityId = parts[0];
                const companyId = parts[1];
                let entityType: 'order' | 'subscription' | 'invoice' = 'order';

                if (entityId.startsWith('SUB_')) {
                    entityType = 'subscription';
                    entityId = entityId.substring(4);
                } else if (entityId.startsWith('INV_')) {
                    entityType = 'invoice';
                    entityId = entityId.substring(4);
                }

                if (!mongoose.Types.ObjectId.isValid(entityId)) return null;

                return {
                    entityId,
                    entityType,
                    status: 'approved',
                    paymentId: String(result.id),
                    companyId
                };
            }
        }
        return null;
    }

    async getPaymentStatus(paymentId: string): Promise<WebhookResult | null> {
        const paymentInstance = new Payment(this._client);
        const result = await paymentInstance.get({ id: String(paymentId) });

        if (!result || !result.status) return null;

        const extRef = result.external_reference;
        let entityId = '';
        let companyId = '';
        let entityType: 'order' | 'subscription' | 'invoice' = 'order';

        if (extRef) {
            const parts = extRef.split('__');
            entityId = parts[0];
            companyId = parts[1];

            if (entityId.startsWith('SUB_')) {
                entityType = 'subscription';
                entityId = entityId.substring(4);
            } else if (entityId.startsWith('INV_')) {
                entityType = 'invoice';
                entityId = entityId.substring(4);
            }
        }

        const statusMap: any = {
            approved: 'approved',
            rejected: 'rejected',
            cancelled: 'rejected',
            refunded: 'rejected',
            pending: 'pending',
            in_process: 'pending'
        };

        const messages: any = {
            cc_rejected_insufficient_amount: 'Recusado por quantia insuficiente (FUND)',
            cc_rejected_bad_filled_security_code: 'Recusado por código de segurança inválido (SECU)',
            cc_rejected_bad_filled_date: 'Recusado por problema com a data de vencimento (EXPI)',
            cc_rejected_invalid_installments: 'Recusado por erro no formulário (FORM)',
            cc_rejected_call_for_authorize: 'Recusado com validação para autorizar (CALL)',
            cc_rejected_other_reason: 'Recusado por erro geral (OTHE)'
        };

        return {
            entityId,
            entityType,
            status: statusMap[result.status] || 'pending',
            paymentId: String(result.id),
            companyId,
            error: result.status_detail ? messages[result.status_detail] : undefined
        };
    }

    async refundPayment(paymentId: string, amount?: number): Promise<any> {
        const paymentRefund = new PaymentRefund(this._client);
        return await paymentRefund.create({
            payment_id: String(paymentId),
            body: amount ? { amount } : undefined
        });
    }

    async cancelPayment(paymentId: string): Promise<any> {
        const paymentInstance = new Payment(this._client);
        return await paymentInstance.cancel({ id: String(paymentId) });
    }

    // ==========================================
    // 🛡️ MECANISMO RESILIENTE (BACKOFF EXPONENCIAL)
    // ==========================================

    private static async retryMercadoPagoRequest<T>(fn: () => Promise<T>, retries = 4, delayMs = 600): Promise<T> {
        let lastError: any = null;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                const message = String(
                    error?.message || error?.error || error?.response?.data?.message || ''
                ).toLowerCase();
                const status = error?.status || error?.response?.status || 0;
                const errorType = String(error?.type || '').toLowerCase();

                const isCircuitOpen =
                    /circuit breaker open/i.test(message) ||
                    /http is unavailable for request/i.test(message) ||
                    /transport: circuit breaker open/i.test(message);

                const isCredentialError =
                    message.includes('user_allowed_only_in_test') || message.includes('invalid_token');

                if (isCircuitOpen || isCredentialError) {
                    console.warn(`🚫 MercadoPago critical error. Aborting retries.`, { status, message });
                    throw error;
                }

                const isTransient =
                    status >= 500 ||
                    status === 0 ||
                    errorType === 'invalid-json' ||
                    message.includes('invalid json response body') ||
                    message.includes('unexpected end of json input') ||
                    message.includes('internal_error') ||
                    message.includes('timeout') ||
                    message.includes('gateway timeout');

                if (!isTransient || attempt === retries) {
                    throw error;
                }

                const waitMs = delayMs * Math.pow(2, attempt);
                console.warn(
                    `⚠️ MercadoPago transient error detected. Retry ${attempt + 1}/${retries} in ${waitMs}ms...`,
                    { status, message, errorType, isCircuitOpen }
                );
                await new Promise((resolve) => setTimeout(resolve, waitMs));
            }
        }
        throw lastError;
    }

    static async createPreference(data: any) {
        // Implementação futura do Checkout Pro se necessário
    }
}
