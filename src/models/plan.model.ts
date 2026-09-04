import * as mongoose from 'mongoose';
import { model } from 'mongoose';

const planSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    max_services: { type: Number, default: 10 },
    allowed_services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    max_units: { type: Number, default: 5 },
    max_users: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, default: 0 },
    billing_cycle: { type: String, enum: ['monthly', 'quarterly', 'semiannual', 'yearly'], default: 'monthly' },
    description: { type: String },
    features: [{ type: String }],
    catalog_module_enabled: { type: Boolean, default: true },
    status: { type: String, required: true, default: 'active' },
    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now }
});

export default model('plans', planSchema);
