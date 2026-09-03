import { Schema, Document, model, Types } from 'mongoose';

export interface ITimelineEvent {
    status: 'SOLICITADO' | 'DATA_SUGERIDA' | 'PROPOSTO' | 'APROVADO' | 'AGENDADO' | 'EM_DESLOCAMENTO' | 'CHECK_IN' | 'EM_EXECUCAO' | 'RELATORIO_CHECKOUT' | 'AVALIACAO' | 'CONCLUIDO' | 'CANCELADO' | 'RECUSADO';
    timestamp: Date;
    location?: { lat: number; lng: number };
    notes?: string;
}

export interface IServiceOrder {
    company_id: Types.ObjectId;
    unit_id: Types.ObjectId;
    service_id: Types.ObjectId;
    collaborator_id?: Types.ObjectId;
    user_id?: Types.ObjectId;
    scheduled_date?: Date;
    
    current_status: 'SOLICITADO' | 'DATA_SUGERIDA' | 'PROPOSTO' | 'APROVADO' | 'AGENDADO' | 'EM_DESLOCAMENTO' | 'CHECK_IN' | 'EM_EXECUCAO' | 'RELATORIO_CHECKOUT' | 'AVALIACAO' | 'CONCLUIDO' | 'CANCELADO' | 'RECUSADO';
    timeline: ITimelineEvent[];
    
    checkin_location?: { lat: number; lng: number };
    checkin_time?: Date;
    
    images_url?: string[];
    report_pdf_url?: string;
    follower_signature?: string;
    technician_signature?: string;
    notes?: string;
    time_spent?: string;
    km_driven?: string;
    fuel_cost?: string;
    zone?: string;
    address_override?: string;
    observations?: string;
    checkout_time?: Date;

    // Campos comerciais e de acompanhante
    client_price?: number;
    client_price_addition?: number;
    technician_price?: number;
    requested_by?: string;
    contract_type?: 'subscription' | 'avulso';
    client_comment?: string;
    client_stars?: number;
    show_to_technician?: boolean;

    // Matriz GUT
    gut_gravity?: number; // 1 a 5
    gut_urgency?: number; // 1 a 5
    gut_trend?: number;   // 1 a 5
    gut_score?: number;   // gravity * urgency * trend

    // Flags de Negociação de Agendamento pelo Lojista/User
    proposed_date?: Date;
    schedule_pending_client_approval?: boolean;

    // Controle de Deslocamento e Impedimentos
    transit_issue_reason?: string;
    is_transit_impeded?: boolean;
    impediment_reason?: string;
    is_execution_impeded?: boolean;

    // Aditivos do Técnico
    aditives?: {
        description: string;
        service_id?: Types.ObjectId;
    }[];
    
    // Controle de Notificações de Agendamento
    reminder_sent_at?: Date;

    createdAt: Date;
    updatedAt: Date;
}

export interface IServiceOrderDocument extends IServiceOrder, Document {}

const TimelineEventSchema = new Schema<ITimelineEvent>({
    status: { 
        type: String, 
        enum: ['SOLICITADO', 'DATA_SUGERIDA', 'PROPOSTO', 'APROVADO', 'AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'RELATORIO_CHECKOUT', 'AVALIACAO', 'CONCLUIDO', 'CANCELADO', 'RECUSADO'], 
        required: true 
    },
    timestamp: { type: Date, required: true },
    location: {
        lat: { type: Number },
        lng: { type: Number }
    },
    notes: { type: String }
}, { _id: false });

const ServiceOrderSchema = new Schema<IServiceOrderDocument>(
    {
        company_id: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
        unit_id: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
        service_id: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
        collaborator_id: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        scheduled_date: { type: Date },
        
        current_status: { 
            type: String, 
            enum: ['SOLICITADO', 'DATA_SUGERIDA', 'PROPOSTO', 'APROVADO', 'AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'RELATORIO_CHECKOUT', 'AVALIACAO', 'CONCLUIDO', 'CANCELADO', 'RECUSADO'], 
            default: 'SOLICITADO' 
        },
        timeline: { type: [TimelineEventSchema], default: [] },
        
        checkin_location: {
            lat: { type: Number },
            lng: { type: Number }
        },
        checkin_time: { type: Date },
        checkout_time: { type: Date },
        
        images_url: { type: [String], default: [] },
        report_pdf_url: { type: String },
        follower_signature: { type: String },
        technician_signature: { type: String },
        notes: { type: String },
        time_spent: { type: String },
        km_driven: { type: String },
        fuel_cost: { type: String },
        zone: { type: String },
        address_override: { type: String },
        observations: { type: String },

        // Mapeamento no banco
        client_price: { type: Number, default: 0 },
        client_price_addition: { type: Number, default: 0 },
        technician_price: { type: Number, default: 0 },
        requested_by: { type: String },
        contract_type: { type: String, enum: ['subscription', 'avulso'], default: 'avulso' },
        client_comment: { type: String, required: false },
        client_stars: { type: Number, required: false },
        show_to_technician: { type: Boolean, default: false },

        // Matriz GUT
        gut_gravity: { type: Number, min: 1, max: 5 },
        gut_urgency: { type: Number, min: 1, max: 5 },
        gut_trend: { type: Number, min: 1, max: 5 },
        gut_score: { type: Number, default: 1 },

        // Flags de Negociação de Agendamento pelo Lojista/User
        proposed_date: { type: Date },
        schedule_pending_client_approval: { type: Boolean, default: false },

        // Controle de Deslocamento e Impedimentos
        transit_issue_reason: { type: String },
        is_transit_impeded: { type: Boolean, default: false },
        impediment_reason: { type: String },
        is_execution_impeded: { type: Boolean, default: false },

        // Aditivos do Técnico
        aditives: [{
            description: { type: String, required: true },
            service_id: { type: Schema.Types.ObjectId, ref: 'Service', required: false }
        }],

        // Lembrete Prévio de Execução
        reminder_sent_at: { type: Date }
    },
    {
        timestamps: true
    }
);

export const ServiceOrder = model<IServiceOrderDocument>('ServiceOrder', ServiceOrderSchema);
export default ServiceOrder;
