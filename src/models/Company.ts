import { Schema, Document, model } from 'mongoose';

export interface ICompany {
  name: string;
  cnpj: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompanyDocument extends ICompany, Document {}

const CompanySchema = new Schema<ICompanyDocument>(
  {
    name: { type: String, required: true },
    cnpj: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

export const Company = model<ICompanyDocument>('Company', CompanySchema);
export default Company;
