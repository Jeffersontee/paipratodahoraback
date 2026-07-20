import stripe from 'stripe';
import { getEnvironmentVariables } from '../../environments/enviroment';
import { IPaymentGateway, WebhookResult } from '../PaymentProvider';

export class Stripe implements IPaymentGateway {
    private instance: stripe;

    // Cliente estático padrão para compatibilidade com OrderController (usa chaves do .env)
    public static client = new stripe(getEnvironmentVariables().stripe?.secret_key || '', { apiVersion: '2022-11-15' as any });

    constructor(secretKey: string) {
        this.instance = new stripe(secretKey, { apiVersion: '2022-11-15' as any });
    }

    async createPix(data: any): Promise<any> {
        // Stripe lida com PIX via PaymentIntents com o método 'pix'
        // Simplificando para seguir a interface
        return this.paymentSheet({ ...data, currency: 'brl' });
    }

    async createCard(data: any): Promise<any> {
        return this.paymentSheet(data);
    }

    async handleWebhook(body: any, query?: any, headers?: any): Promise<WebhookResult | null> {
        // Nota: Em produção, você deve usar stripe.webhooks.constructEvent aqui com o webhookSecret
        const event = body as stripe.Event;
        const stripeInstance = this.instance;

        if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as stripe.PaymentIntent;
            const metadata = paymentIntent.metadata || {};

            let entityType: 'order' | 'subscription' | 'invoice' = 'order';
            let entityId = metadata.order_id || metadata.subscription_id || metadata.invoice_id;

            if (metadata.subscription_id) entityType = 'subscription';
            else if (metadata.invoice_id) entityType = 'invoice';

            if (!entityId) return null;

            return {
                entityId,
                entityType,
                status: event.type === 'payment_intent.succeeded' ? 'approved' : 'rejected',
                paymentId: paymentIntent.id,
                companyId: metadata.company_id || metadata.establishment_id,
                error: paymentIntent.last_payment_error?.message
            };
        }

        return null;
    }

    async getPaymentStatus(paymentId: string): Promise<WebhookResult | null> {
        const paymentIntent = await this.instance.paymentIntents.retrieve(paymentId);
        if (!paymentIntent) return null;

        const metadata = paymentIntent.metadata || {};
        const entityId = metadata.order_id || metadata.subscription_id || metadata.invoice_id;
        let entityType: 'order' | 'subscription' | 'invoice' = 'order';
        if (metadata.subscription_id) entityType = 'subscription';
        else if (metadata.invoice_id) entityType = 'invoice';

        const statusMap: any = {
            succeeded: 'approved',
            requires_payment_method: 'rejected',
            canceled: 'rejected',
            processing: 'pending',
            requires_action: 'pending'
        };

        return {
            entityId: entityId || '',
            entityType,
            status: statusMap[paymentIntent.status] || 'pending',
            paymentId: paymentIntent.id,
            companyId: metadata.company_id || metadata.establishment_id,
            error: paymentIntent.last_payment_error?.message
        };
    }

    private async createCustomer(name: string, email: string) {
        try {
            const params: stripe.CustomerCreateParams = {
                email: email,
                name: name
            };

            const customer: stripe.Customer = await (this?.instance || Stripe.client).customers.create(params);
            console.log(customer.id);
            return customer;
        } catch (e) {
            throw e;
        }
    }

    // Transformado em static para suportar a chamada legada em OrderController.ts
    static async paymentSheet(
        data: { name: string; email: string; amount: number; currency: string },
        customInstance?: stripe
    ) {
        const stripeInstance = customInstance || Stripe.client;
        try {
            const customer = await stripeInstance.customers.create({ name: data.name, email: data.email });
            const ephemeralKey = await stripeInstance.ephemeralKeys.create(
                { customer: customer.id },
                { apiVersion: '2020-08-27' }
            );
            const paymentIntent = await stripeInstance.paymentIntents.create({
                amount: data.amount,
                currency: data.currency,
                customer: customer.id,
                metadata: {
                    establishment_id: (data as any).establishment_id,
                    order_id: (data as any).order_id,
                    subscription_id: (data as any).subscription_id
                },
                automatic_payment_methods: {
                    enabled: true
                }
            });

            const response = {
                paymentIntent: paymentIntent.client_secret,
                ephemeralKey: ephemeralKey.secret,
                customer: customer.id
            };
            return response;
        } catch (e) {
            throw e;
        }
    }

    // Wrapper para a interface IPaymentGateway
    async paymentSheet(data: any) {
        return Stripe.paymentSheet(data, this.instance);
    }
}
