import { Schema, Document, model, Types } from 'mongoose';

export interface IRating {
    service_order_id: Types.ObjectId;
    company_id: Types.ObjectId;
    stars: number; // 1 a 5
    comment?: string;
    show_to_technician: boolean; // Configuração futura para Super Admin ativar/desativar visualização do técnico
    createdAt: Date;
    updatedAt: Date;
}

export interface IRatingDocument extends IRating, Document {}

const RatingSchema = new Schema<IRatingDocument>(
    {
        service_order_id: { type: Schema.Types.ObjectId, ref: 'ServiceOrder', required: true },
        company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        stars: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: false },
        show_to_technician: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

export const Rating = model<IRatingDocument>('Rating', RatingSchema);
export default Rating;
