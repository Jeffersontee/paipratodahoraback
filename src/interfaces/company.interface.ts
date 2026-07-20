export interface ICompany {
    _id?: string; // Opcional para quando vem do banco
    name: string;
    owner_name?: string;
    short_name?: string;
    description?: string;
    cnpj: string;
    email?: string;
    active: boolean;
    subscription_status?: 'trial' | 'active' | 'inactive' | 'canceled'; // Tipagem estrita
    next_payment_date?: Date;
    subscription_id?: any;
    services?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

// Tipo específico para os dados necessários no momento da criação (sem _id, createdAt, etc.)
export type ICompanyCreateInput = Omit<ICompany, '_id' | 'createdAt' | 'updatedAt' | 'subscription_id'>;
