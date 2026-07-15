import { Schema, Document, model } from 'mongoose';

export interface ICompany {
    name: string;
    owner_name: string;
    short_name: String;
    description: String;
    cnpj: string;
    email: String;
    active: boolean;
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
        active: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

export const Company = model<ICompanyDocument>('Company', CompanySchema);
export default Company;
