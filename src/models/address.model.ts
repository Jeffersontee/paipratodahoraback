import { Schema, Document, model, Types } from 'mongoose';

export interface IAddress {
    user_id?: Types.ObjectId;
    company_id?: Types.ObjectId;
    unit_id?: Types.ObjectId;
    title: string;
    zipcode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    address: string;
    house?: string;
    landmark?: string;
    lat: number;
    lng: number;
    is_default: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAddressDocument extends IAddress, Document {}

const AddressSchema = new Schema<IAddressDocument>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: false, default: null },
        company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: false, default: null },
        unit_id: { type: Schema.Types.ObjectId, ref: 'Unit', required: false, default: null },
        title: { type: String, required: true, default: 'Endereço Principal' },
        zipcode: { type: String, required: false },
        street: { type: String, required: false },
        number: { type: String, required: false },
        complement: { type: String, required: false },
        neighborhood: { type: String, required: false },
        city: { type: String, required: false },
        state: { type: String, required: false },
        address: { type: String, required: true },
        house: { type: String, required: false },
        landmark: { type: String, required: false },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        is_default: { type: Boolean, default: false }
    },
    {
        timestamps: true
    }
);

// Index para otimizar busca por usuário e ordenação
AddressSchema.index({ user_id: 1, is_default: -1 });

export const Address = model<IAddressDocument>('Address', AddressSchema);
export default Address;
