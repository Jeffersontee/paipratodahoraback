import * as mongoose from 'mongoose';
import { model } from 'mongoose';

const helpTopicSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    content: [{ type: String, required: true }] // Array de parágrafos/strings
}, { _id: true }); // Mongoose criará ObjectId para subdocumentos

const helpCategorySchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    icon: { type: String, required: true, default: 'information-circle-outline' },
    topics: [helpTopicSchema],
    order: { type: Number, default: 0 },
    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now },
});

// Middleware PRE: Atualização de auditoria
helpCategorySchema.pre('save', function (next) {
    const doc = this as any;
    doc.updated_at = new Date();
    next();
});

helpCategorySchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate() as any;
    if (update) {
        update.updated_at = new Date();
    }
    next();
});

export default model('help_categories', helpCategorySchema);
