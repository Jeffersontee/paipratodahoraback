import * as mongoose from 'mongoose';
import { model } from 'mongoose';

const globalOrderSchema = new mongoose.Schema(
    {
        customer_id: { type: mongoose.Types.ObjectId, ref: 'users', required: true },
        establishment_id: { type: mongoose.Types.ObjectId, ref: 'establishments', required: true },
        tenant_order_id: { type: mongoose.Types.ObjectId, required: true }, // ID original no banco isolado
        items: { type: Array, required: true }, // Itens denormalizados para Analytics Global (IOrderItem[])
        status: { type: String, required: true },
        total: { type: Number, required: true },
        grandTotal: { type: Number, required: true },
        payment_status: { type: Boolean, required: true },
        delivery_person: { type: String, default: null },
        delivery_phone: { type: String, default: null },
        created_at: { type: Date, required: true, default: Date.now }
    },
    { timestamps: true }
);

// Índice vital para performance de busca por usuário
globalOrderSchema.index({ customer_id: 1, createdAt: -1 });

export default model('global_orders', globalOrderSchema);
