import { Schema, Document, model, Types } from 'mongoose';

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface IUser {
  name: string;
  email: string;
  role: UserRole;
  companyId?: Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['super_admin', 'admin', 'user'], default: 'user' },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    active: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

export const User = model<IUserDocument>('User', UserSchema);
export default User;
