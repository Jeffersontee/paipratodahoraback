import * as mongoose from 'mongoose';

const AuditSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, ref: 'users' },
    establishment_id: { type: mongoose.Types.ObjectId, ref: 'establishments' },
    action: { type: String, required: true }, // Ex: 'PAYMENT_ERROR', 'WEBHOOK_FAILED'
    module: { type: String, required: true }, // Ex: 'PAYMENT', 'ORDER', 'AUTH', 'SECURITY'
    severity: { type: String, enum: ['info', 'warn', 'error', 'critical'], default: 'info' },
    details: { type: mongoose.Schema.Types.Mixed }, // Payload do erro, mensagem, etc.
    path: { type: String }, // URL que gerou o log
    method: { type: String }, // GET, POST, etc.
    ip: { type: String },
    created_at: { type: Date, default: Date.now }
});

AuditSchema.index({ created_at: -1 });

export default mongoose.model('audits', AuditSchema);
