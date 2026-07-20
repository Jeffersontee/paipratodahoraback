import * as mongoose from 'mongoose';
import { model } from 'mongoose';

const planSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    max_items: { type: Number, required: true },
    max_categories: { type: Number, required: true },
    max_banners: { type: Number, required: true },
    max_users: { type: Number, required: true, default: 1 },
    price: { type: Number, required: true, default: 0 },
    description: { type: String },
    features: [{ type: String }],
    status: { type: String, required: true, default: 'active' },
    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now }
});

export default model('plans', planSchema);
