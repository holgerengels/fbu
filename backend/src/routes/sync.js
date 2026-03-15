const express = require('express');
const router = express.Router();
const Fachberater = require('../models/Fachberater');
const { updateUser } = require('../services/moodle');

// POST /api/sync/to-moodle - DISABLED for safety
router.post('/sync/to-moodle', async (req, res) => {
    return res.status(403).json({ error: 'Moodle-Sync ist deaktiviert' });
    /* Original implementation disabled for safety
    try {
        const fachberater = await Fachberater.find({
            status: 'vollstaendig',
            moodleId: { $ne: '' }
        });

        let synced = 0;
        let failed = 0;
        const errors = [];

        for (const fb of fachberater) {
            try {
                const fields = {};

                // Update custom profile fields (e.g. Fächer)
                if (fb.faecher && fb.faecher.length > 0) {
                    fields.faecher = fb.faecher.join(', ');
                }

                if (Object.keys(fields).length > 0) {
                    await updateUser(fb.moodleId, fields);
                    synced++;
                }
            } catch (err) {
                failed++;
                errors.push({ id: fb._id, name: `${fb.vorname} ${fb.nachname}`, error: err.message });
            }
        }

        res.json({ synced, failed, total: fachberater.length, errors });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
    */
});

module.exports = router;
