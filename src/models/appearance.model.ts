import * as mongoose from 'mongoose';
import { model, Document, Schema } from 'mongoose';

export interface IAppearance extends Document {
  tenant_type: 'GLOBAL' | 'COMPANY';
  company_id?: string;
  theme: 'light' | 'dark';
  primary_color: string;
  logo_url: string;
  background_url: string;
  created_at?: Date;
  updated_at?: Date;
}

const appearanceSchema = new Schema<IAppearance>(
  {
    tenant_type: { 
      type: String, 
      enum: ['GLOBAL', 'COMPANY'], 
      required: true 
    },
    company_id: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Company',
      required: false
    },
    theme: { 
      type: String, 
      enum: ['light', 'dark'], 
      default: 'light' 
    },
    primary_color: { 
      type: String, 
      default: '#1d4ed8' // Azul Bravo default
    },
    logo_url: { 
      type: String, 
      default: '' 
    },
    background_url: { 
      type: String, 
      default: '' 
    }
  },
  { timestamps: true }
);

// Indexes
appearanceSchema.index({ tenant_type: 1, company_id: 1 }, { unique: true });

export default model<IAppearance>('Appearance', appearanceSchema);
