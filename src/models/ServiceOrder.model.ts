import { Schema, Document, model, Types } from 'mongoose';

export interface ITimelineEvent {
    status: 'AGENDADO' | 'EM_DESLOCAMENTO' | 'CHECK_IN' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'CANCELADO';
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
    
    current_status: 'AGENDADO' | 'EM_DESLOCAMENTO' | 'CHECK_IN' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'CANCELADO';
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
    
    createdAt: Date;
    updatedAt: Date;
}

export interface IServiceOrderDocument extends IServiceOrder, Document {}

const TimelineEventSchema = new Schema<ITimelineEvent>({
    status: { type: String, enum: ['AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO'], required: true },
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
        
        current_status: { type: String, enum: ['AGENDADO', 'EM_DESLOCAMENTO', 'CHECK_IN', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO'], default: 'AGENDADO' },
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
        observations: { type: String }
    },
    {
        timestamps: true
    }
);

export const ServiceOrder = model<IServiceOrderDocument>('ServiceOrder', ServiceOrderSchema);
export default ServiceOrder;
