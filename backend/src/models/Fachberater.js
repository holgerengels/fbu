const mongoose = require('mongoose');

const fachberaterSchema = new mongoose.Schema({
    vorname: { type: String, default: '' },
    nachname: { type: String, default: '' },
    schule: { type: String, default: '' },
    ort: { type: String, default: '' },
    rp: { type: String, default: '' },
    email: { type: String, default: '' },
    anmeldename: { type: String, default: '' },
    faecher: [{ type: String }],
    moodleId: { type: String, default: '' },
    moodleData: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
        type: [String],
        enum: ['neu', 'registriert', 'nicht_registriert', 'vollstaendig'],
        default: ['neu']
    },
    matchScore: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Compound index for duplicate detection
fachberaterSchema.index({ nachname: 1, vorname: 1, schule: 1 });
fachberaterSchema.index({ status: 1 });
fachberaterSchema.index({ rp: 1 });

module.exports = mongoose.model('Fachberater', fachberaterSchema);
