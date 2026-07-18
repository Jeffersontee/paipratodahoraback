import * as mongoose from 'mongoose';
import { model } from 'mongoose';

const bannerSchema = new mongoose.Schema({
    banner: { type: String, required: true },
    company_id: { type: mongoose.Types.ObjectId, ref: 'Company', required: false },
    city_id: { type: mongoose.Types.ObjectId, ref: 'cities', required: false },
    is_global: { type: Boolean, default: false },
    radius: { type: Number, default: 5 },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] } // [longitude, latitude]
    },
    status: { type: Boolean, required: true, default: true },
    clicks: { type: Number, default: 0 },
    expires_at: { type: Date, required: true },
    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now }
});

// Esta é a linha crucial para a performance:
bannerSchema.index({ location: '2dsphere' });

export default model('banners', bannerSchema);
