import { Schema, Document, model, Types } from 'mongoose';

export interface IRating {
    service_order_id: Types.ObjectId;
    company_id?: Types.ObjectId;
    user_id?: Types.ObjectId;
    collaborator_id?: Types.ObjectId;
    service_id?: Types.ObjectId;
    stars: number; // 1 a 5
    comment?: string;
    tags?: string[];
    show_to_technician: boolean; // Configuração para visualização do técnico
    createdAt: Date;
    updatedAt: Date;
}

export interface IRatingDocument extends IRating, Document {}

const RatingSchema = new Schema<IRatingDocument>(
    {
        service_order_id: { type: Schema.Types.ObjectId, ref: 'ServiceOrder', required: true, index: true },
        company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: false, default: null, index: true },
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
        collaborator_id: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null, index: true },
        service_id: { type: Schema.Types.ObjectId, ref: 'Service', required: false, default: null },
        stars: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: false },
        tags: { type: [String], default: [] },
        show_to_technician: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

export const Rating = model<IRatingDocument>('Rating', RatingSchema);
export default Rating;
