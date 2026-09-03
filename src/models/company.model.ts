import { Schema, Document, model } from 'mongoose';
import { ICompany } from '../interfaces/company.interface'; // Importa a interface limpa

// Estende a interface pura apenas para o escopo do Mongoose
export interface ICompanyDocument extends Omit<ICompany, '_id'>, Document {}

const CompanySchema = new Schema<ICompanyDocument>(
    {
        name: { type: String, required: true },
        owner_name: { type: String },
        short_name: { type: String, required: false },
        description: { type: String, required: false },
        cnpj: { type: String, required: true, unique: true },
        email: { type: String },
        phone: { type: String },
        active: { type: Boolean, default: true },
        subscription_status: { type: String, default: 'active' },
        next_payment_date: { type: Date, required: false },
        subscription_id: { type: Schema.Types.ObjectId, ref: 'subscriptions', required: false },
        services: [{ type: Schema.Types.ObjectId, ref: 'Service', default: [] }]
    },
    {
        timestamps: true
    }
);

export const Company = model<ICompanyDocument>('Company', CompanySchema);
export default Company;
