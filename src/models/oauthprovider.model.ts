import * as mongoose from 'mongoose';

const oauthProviderSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // 'google', 'facebook', 'apple'
    client_id: { type: String, required: true },
    client_secret: { type: String, required: true },
    redirect_uri: { type: String, required: true },
    scopes: [{ type: String }],
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

export default mongoose.model('oauth_providers', oauthProviderSchema);
