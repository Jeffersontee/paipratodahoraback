import { Schema, Document, model, Types } from 'mongoose';

export interface ITimelineEvent {
    status: 'SOLICITADO' | 'DATA_SUGERIDA' | 'PROPOSTO' | 'APROVADO' | 'AGENDADO' | 'EM_DESLOCAMENTO' | 'CHECK_IN' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'CANCELADO' | 'RECUSADO';
    timestamp: Date;
    location?: { lat: number; lng: number };
    notes?: string;
}

export interface IServiceOrder {
    company_id: Types.ObjectId;
    unit_id: Types.ObjectId;
    service_id: Types.ObjectId;
    collaborator_id?: Types.ObjectId;
    scheduled_date?: Date;
    
    current_status: 'SOLICITADO' | 'DATA_SUGERIDA' | 'PROPOSTO' | 'APROVADO' | 'AGENDADO' | 'EM_DESLOCAMENTO' | 'CHECK_IN' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'CANCELADO' | 'RECUSADO';
    timeline: ITimelineEvent[];
    
    checkin_location?: { lat: number; lng: number };
    checkin_time?: Date;
    
    images_url?: string[];
    report_pdf_url?: string;
    follower_signature?: string;
    notes?: string;
    time_spent?: string;
    km_driven?: string;
    fuel_cost?: string;
    zone?: string;
    address_override?: string;
    observations?: string;

    // Campos comerciais e de acompanhante adicionados
    client_price?: number;
    client_price_addition?: number;
    technician_price?: number;
    requested_by?: string;
    contract_type?: 'subscription' | 'avulso';
    
    createdAt: Date;
    updatedAt: Date;
}

export interface IServiceOrderDocument extends IServiceOrder, Document {}

const TimelineEventSchema = new Schema<ITimelineEvent>({
    status: { 
        type: String, 
        enum: ['SOLICITADO', 'DATA_SUGERIDA', 'PROPOSTO', 'APROVADO', 'AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO', 'RECUSADO'], 
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
        scheduled_date: { type: Date },
        
        current_status: { 
            type: String, 
            enum: ['SOLICITADO', 'DATA_SUGERIDA', 'PROPOSTO', 'APROVADO', 'AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO', 'RECUSADO'], 
            default: 'SOLICITADO' 
        },
        timeline: { type: [TimelineEventSchema], default: [] },
        
        checkin_location: {
            lat: { type: Number },
            lng: { type: Number }
        },
        checkin_time: { type: Date },
        
        images_url: { type: [String], default: [] },
        report_pdf_url: { type: String },
        follower_signature: { type: String },
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
        contract_type: { type: String, enum: ['subscription', 'avulso'], default: 'avulso' }
    },
    {
        timestamps: true
    }
);

export const ServiceOrder = model<IServiceOrderDocument>('ServiceOrder', ServiceOrderSchema);
export default ServiceOrder;
