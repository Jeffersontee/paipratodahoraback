import * as mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema(
    {
        company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
        subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'subscriptions', required: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: ['paid', 'pending', 'overdue', 'cancelled'],
            default: 'pending'
        },
        payment_method: { type: String }, // 'pix', 'card'
        payment_date: { type: Date },
        due_date: { type: Date, required: true },
        external_id: { type: String }, // ID do Mercado Pago/Stripe
        pdf_url: { type: String },
        notes: { type: String }
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

InvoiceSchema.index({ company_id: 1, status: 1 });
InvoiceSchema.index({ created_at: -1 });

export default mongoose.model('invoices', InvoiceSchema);
