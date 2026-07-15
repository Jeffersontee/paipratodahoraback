import * as mongoose from 'mongoose';

const oauthTokenSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    provider: { type: String, required: true },
    provider_user_id: { type: String, required: true },
    access_token: { type: String, required: true },
    refresh_token: { type: String },
    iv: { type: String, required: true }, // Vetor de inicialização para decriptação segura
    token_type: { type: String, default: 'Bearer' },
    expires_at: { type: Date },
    scope: { type: String },
    id_token: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    last_used_at: { type: Date, default: Date.now },
    is_active: { type: Boolean, default: true }
});

oauthTokenSchema.index({ user_id: 1, provider: 1, is_active: 1 });
oauthTokenSchema.index({ expires_at: 1, is_active: 1 });
oauthTokenSchema.index({ provider: 1, provider_user_id: 1, is_active: 1 }, { unique: true });

export default mongoose.model('oauth_tokens', oauthTokenSchema);
