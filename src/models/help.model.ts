const mongoose = require('mongoose');

const HelpTopicSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: [{ type: String, required: true }],
    roles: [{ type: String, enum: ['user', 'admin', 'superadmin'], default: ['user', 'admin', 'superadmin'] }]
});

const HelpSectionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    icon: { type: String, required: true },
    topics: [HelpTopicSchema]
});

module.exports = mongoose.model('HelpSection', HelpSectionSchema);
