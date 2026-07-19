import { MercadoPago } from './integrations/MercadoPago';
import { Stripe } from './integrations/Stripe';
import { PayPal } from './integrations/PayPal';
import { Utils } from '../utils/Utils';

export interface WebhookResult {
    entityId: string;
    entityType: 'order' | 'subscription' | 'invoice';
    status: 'approved' | 'rejected' | 'pending';
    paymentId: string;
    establishmentId?: string;
    error?: string;
}

export interface IPaymentGateway {
    createPix(data: any): Promise<any>;
    createCard(data: any): Promise<any>;
    handleWebhook(body: any, query?: any, headers?: any): Promise<WebhookResult | null>;
    getPaymentStatus(paymentId: string): Promise<WebhookResult | null>;
    refundPayment?(paymentId: string, amount?: number): Promise<any>;
    cancelPayment?(paymentId: string): Promise<any>;
}

export class PaymentProvider {
    /**
     * Retorna a implementação do gateway baseada na configuração do banco de dados.
     * @param config Objeto payment_config vindo do Establishment ou User
     */
    static getGateway(config: any): IPaymentGateway {
        const gatewayType = config?.gateway || 'mercado_pago';

        // Resolve as credenciais: Suporta tanto o padrão antigo 'credentials' quanto o novo padrão OAuth 'mercado_pago'
        let credentials = config?.credentials;
        if (gatewayType === 'mercado_pago' && config?.mercado_pago) {
            credentials = config.mercado_pago;
        }

        switch (gatewayType) {
            case 'mercado_pago':
                let token = credentials?.accessToken;

                if (!token) throw new Error('AccessToken do Mercado Pago não configurado ou inválido.');

                // Se o token estiver encriptado (objeto com encrypted e iv), descriptografamos para uso no SDK
                // Descriptografa com segurança se for o objeto de OAuth salvo pelo script/util
                if (typeof token === 'object' && token.encrypted && token.iv) {
                    token = Utils.decryptOAuthToken(token.encrypted, token.iv);
                }

                return new MercadoPago(token);

            case 'stripe':
                if (!credentials?.accessToken) throw new Error('SecretKey do Stripe não configurada.');
                return new Stripe(credentials.accessToken);

            case 'paypal':
                if (!credentials?.accessToken) throw new Error('AccessToken do PayPal não configurado.');
                return new PayPal(credentials.accessToken);

            default:
                throw new Error(`Gateway [${gatewayType}] não é suportado pelo sistema.`);
        }
    }
}
