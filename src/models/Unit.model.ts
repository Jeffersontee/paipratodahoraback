import { Schema, Document, model, Types } from 'mongoose';

export interface IUnitAddress {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
    lat?: number;
    lng?: number;
}

export interface IUnit {
    name: string;
    company_id: Types.ObjectId;
    address: IUnitAddress;
    manager_id?: Types.ObjectId;
    follower_ids?: Types.ObjectId[];
    status: 'ACTIVE' | 'INACTIVE';
    cnpj?: string;
    phone?: string;
    email?: string;
    short_name?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUnitDocument extends IUnit, Document {}

const UnitAddressSchema = new Schema<IUnitAddress>({
    street: { type: String, required: true },
    number: { type: String, required: true },
    complement: { type: String },
    neighborhood: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipcode: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number }
}, { _id: false });

const UnitSchema = new Schema<IUnitDocument>(
    {
        name: { type: String, required: true },
        company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        address: { type: UnitAddressSchema, required: true },
        manager_id: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        follower_ids: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
        cnpj: { type: String, required: false },
        phone: { type: String, required: false },
        email: { type: String, required: false },
        short_name: { type: String, required: false }
    },
    {
        timestamps: true
    }
);

export const Unit = model<IUnitDocument>('Unit', UnitSchema);
export default Unit;
