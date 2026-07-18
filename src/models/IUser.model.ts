import { Types } from 'mongoose';

export interface IUser {
    _id: any; // Aceita string ou ObjectId sem conflitos de propriedades internas
    email: string;
    aud?: string; // Adicionado para refletir o payload do JWT
    name: string;
    phone: string;
    type: 'super_admin' | 'company_owner' | 'admin' | 'user' | 'staff' | 'super_staff';
    status: string;
    company_id?: any; // Facilita a atribuição vinda do banco ou tokens
    cpf?: string | null;
    photo?: string | null;
    email_verified?: boolean;
    subscription_status?: string;
    next_payment_date?: Date | string | null;
    role?: 'atendente' | 'caixa' | 'entregador' | 'suporte' | 'gestor_estabelecimentos' | 'gestor_financeiro' | string;
    permissions?: string[];
    created_at?: Date | string;
    updated_at?: Date | string;
}
