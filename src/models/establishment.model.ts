import * as mongoose from 'mongoose';
import { model } from 'mongoose';

const establishmentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, ref: 'users', required: true },
    city_id: { type: mongoose.Types.ObjectId, ref: 'cities', required: true },
    // O PONTEIRO DA RELAÇÃO CORRETA: Aponta para o contrato vigente
    subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'subscriptions' },
    res_name: { type: String, required: true },
    db_name: { type: String, required: true, unique: true }, // Nome do banco isolado
    name: { type: String, required: true },
    short_name: { type: String },
    description: { type: String },
    cover: { type: String, required: true },
    location: { type: Object, required: true },
    phone: { type: String },
    email: { type: String },
    cuisines: { type: Array, required: true },
    openTime: { type: String, required: true },
    closeTime: { type: String, required: true },
    price: { type: Number, required: true },
    address: { type: String, required: true },
    delivery_time: { type: Number, required: true },
    isClose: { type: Boolean, required: true, default: false },
    status: { type: String, required: true, default: 'active' },
    owner_name: { type: String },
    orders_count: { type: Number, default: 0 },
    avg_order_value: { type: Number, default: 0 },
    daily_sales_target: { type: Number, default: 1000 },
    tags: [{ type: String }],
    notes: { type: String },
    is_premium: { type: Boolean, default: false },
    open_days: [{ type: Number }], // [0, 1, 2, 3, 4, 5, 6]
    payment_config: {
        gateway: { type: String, enum: ['mercado_pago', 'stripe', 'razorpay'], default: 'mercado_pago' },
        credentials: {
            publicKey: { type: String },
            accessToken: { type: String },
            webhookSecret: { type: String }
        },
        mercado_pago: {
            accessToken: {
                encrypted: { type: String },
                iv: { type: String }
            },
            refresh_token: {
                encrypted: { type: String },
                iv: { type: String }
            },
            public_key: { type: String },
            user_id: { type: Number },
            expires_in: { type: Number },
            last_authorization: { type: Date },
            status: { type: String },
            refresh_fail_count: { type: Number, default: 0 }
        }
    },

    gateway_provider: { type: String, enum: ['mercado_pago', 'stripe', 'paypal', 'razorpay'], default: 'mercado_pago' },
    enabled_payment_methods: { type: [String], enum: ['cod', 'online'], default: ['cod', 'online'] },

    // Campos Unificados SaaS
    subscription_status: {
        type: String,
        enum: ['active', 'trial', 'paused', 'cancelled', 'inactive'],
        default: 'inactive'
    },
    subscription_date: { type: Date },
    cancelled_at: { type: Date },
    monthly_revenue: { type: Number, default: 0 },
    total_revenue: { type: Number, default: 0 },
    payment_method: { type: String },
    last_payment_date: { type: Date },
    next_payment_date: { type: Date },
    payment_status: { type: String, enum: ['paid', 'pending', 'failed', 'overdue'] },

    rating: { type: Number, required: true, default: 0 },
    totalRating: { type: Number, required: true, default: 0 },

    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now }
});

establishmentSchema.index({ location: '2dsphere' }, { background: true });

export default model('establishments', establishmentSchema);
