import { Schema, Document, model, Types } from 'mongoose';

export interface IService {
    name: string;
    description: string;
    icon: string;
    category: string;
    price: number;
    status: 'ACTIVE' | 'INACTIVE';
    company_id?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IServiceDocument extends IService, Document {}

const ServiceSchema = new Schema<IServiceDocument>(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true },
        category: { type: String, required: true },
        price: { type: Number, required: true },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
        company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: false }
    },
    {
        timestamps: true
    }
);

export const Service = model<IServiceDocument>('Service', ServiceSchema);
export default Service;
