import { Schema, Document, model, Types } from 'mongoose';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  type: string;
  status: string;
  fcm_token?: string;
  verification_token?: string;
  verification_token_time?: number | Date;
  cpf?: string;
  email_verified?: boolean;
  photo?: string;
  reset_password_token?: string;
  reset_password_token_time?: number | Date;
  establishment_id?: Types.ObjectId;
  role?: string;
  permissions?: string[];
  global_payment_config?: any;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    phone: { type: String, required: false },
    type: { type: String, required: true, default: 'user' },
    status: { type: String, required: true, default: 'active' },
    fcm_token: { type: String, required: false },
    verification_token: { type: String, required: false },
    verification_token_time: { type: Schema.Types.Mixed, required: false },
    cpf: { type: String, required: false },
    email_verified: { type: Boolean, required: false, default: false },
    photo: { type: String, required: false },
    reset_password_token: { type: String, required: false },
    reset_password_token_time: { type: Schema.Types.Mixed, required: false },
    establishment_id: { type: Schema.Types.ObjectId, ref: 'Establishment', required: false, default: null },
    role: { type: String, required: false },
    permissions: [{ type: String }],
    global_payment_config: { type: Schema.Types.Mixed, required: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

export const User = model<IUserDocument>('User', UserSchema);
export default User;
