import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema(
    {
        company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'plans', required: false },
        status: {
            type: String,
            enum: ['active', 'past_due', 'canceled', 'trialing'],
            default: 'trialing'
        },
        current_period_start: { type: Date, default: Date.now },
        current_period_end: { type: Date, required: true },
        cancel_at_period_end: { type: Boolean, default: false },
        gateway_provider: {
            type: String,
            enum: ['mercado_pago', 'stripe', 'paypal', 'razorpay'],
            default: 'mercado_pago'
        },
        payment_method: { type: String }, // 'pix', 'card'
        external_subscription_id: { type: String }, // ID do Mercado Pago/Stripe
        last_payment_id: { type: String },
        last_payment_date: { type: Date },
        next_payment_date: { type: Date },
        payment_status: { type: String, enum: ['paid', 'pending', 'failed', 'overdue'] },

        price_at_subscription: { type: Number, required: true }, // Garantia de preço contratado

        // Métricas Financeiras movidas para cá (Isola faturamento por Assinatura)
        monthly_revenue: { type: Number, default: 0 },
        total_revenue: { type: Number, default: 0 }
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

SubscriptionSchema.index({ company_id: 1, status: 1 });

export default mongoose.model('subscriptions', SubscriptionSchema);
