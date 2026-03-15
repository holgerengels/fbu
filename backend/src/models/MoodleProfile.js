const mongoose = require('mongoose');

const moodleProfileSchema = new mongoose.Schema({
    moodleId: { type: String, required: true, unique: true },
    anmeldename: { type: String, default: '' },
    vorname: { type: String, default: '' },
    nachname: { type: String, default: '' },
    email: { type: String, default: '' },
    schulname: { type: String, default: '' },
    schulort: { type: String, default: '' },
    rp: { type: String, default: '' },
    faecher: [{ type: String }]
}, {
    timestamps: true
});

moodleProfileSchema.index({ nachname: 1, vorname: 1 });
moodleProfileSchema.index({ rp: 1 });

module.exports = mongoose.model('MoodleProfile', moodleProfileSchema);
