import { Schema, Document, model } from 'mongoose';

export interface ICompany {
    name: string;
    owner_name: string;
    short_name: String;
    description: String;
    cnpj: string;
    email: String;
    active: boolean;
    subscription_status?: string;
    next_payment_date?: Date;
    subscription_id?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICompanyDocument extends ICompany, Document {}

const CompanySchema = new Schema<ICompanyDocument>(
    {
        name: { type: String, required: true },
        owner_name: { type: String },
        short_name: { type: String, required: false },
        description: { type: String, required: false },
        cnpj: { type: String, required: true, unique: true },
        email: { type: String },
        active: { type: Boolean, default: true },
        subscription_status: { type: String, default: 'active' }, // trial, active, inactive, canceled
        next_payment_date: { type: Date, required: false },
        subscription_id: { type: Schema.Types.ObjectId, ref: 'subscriptions', required: false }
    },
    {
        timestamps: true
    }
);

export const Company = model<ICompanyDocument>('Company', CompanySchema);
export default Company;
