const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Fachberater = require('../models/Fachberater');
const MoodleProfile = require('../models/MoodleProfile');

let settingsPath = path.join(__dirname, '../../../config/settings.json');
let settings = {};
try {
    if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
} catch (err) {
    console.warn(`[Config] Warning: ${err.message}`);
}
const moodleConfig = settings.moodle || {};
const moodleBaseUrl = (moodleConfig.url || 'https://fachnetz-bs.zsl-bw.de').replace(/\/$/, '');

// GET /api/fachberater/stats - Dashboard statistics
router.get('/fachberater/stats', async (req, res) => {
    try {
        const [total, neu, registriert, nichtRegistriert, vollstaendig, moodleProfileCount] = await Promise.all([
            Fachberater.countDocuments(),
            Fachberater.countDocuments({ status: 'neu' }),
            Fachberater.countDocuments({ status: 'registriert' }),
            Fachberater.countDocuments({ status: 'nicht_registriert' }),
            Fachberater.countDocuments({ status: 'vollstaendig' }),
            MoodleProfile.countDocuments()
        ]);

        const rpStats = await Fachberater.aggregate([
            { $group: { _id: '$rp', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            total,
            neu,
            registriert,
            nicht_registriert: nichtRegistriert,
            vollstaendig,
            moodleProfiles: moodleProfileCount,
            byRp: rpStats.map(r => ({ rp: r._id, count: r.count }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fachberater/export - CSV export
router.get('/fachberater/export', async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.rp) filter.rp = req.query.rp;

        const docs = await Fachberater.find(filter).sort({ rp: 1, nachname: 1, vorname: 1 });

        const header = 'RP;Nachname;Vorname;Schule;Ort;Email;Anmeldename;Fächer;Status;Moodle-Profil;Moodle-Fächer';
        const rows = docs.map(d => {
            let moodleLink = '';
            let moodleFaecher = '';
            if (d.moodleId && !String(d.moodleId).startsWith('csv_')) {
                moodleLink = `${moodleBaseUrl}/user/view.php?id=${d.moodleId}`;
            }
            if (d.moodleData && Array.isArray(d.moodleData.faecher)) {
                moodleFaecher = d.moodleData.faecher.join(', ');
            }
            return `"${d.rp}";"${d.nachname}";"${d.vorname}";"${d.schule}";"${d.ort}";"${d.email}";"${d.anmeldename}";"${(d.faecher || []).join(', ')}";"${(d.status || []).join('+')}";"${moodleLink}";"${moodleFaecher}"`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=fachberater_export.csv');
        res.send('\uFEFF' + header + '\n' + rows.join('\n'));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fachberater - List with pagination and filtering
router.get('/fachberater', async (req, res) => {
    try {
        const { page = 1, limit = 50, status, rp, search, sortBy, sortOrder } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (rp) filter.rp = rp;
        if (search) {
            filter.$or = [
                { nachname: { $regex: search, $options: 'i' } },
                { vorname: { $regex: search, $options: 'i' } },
                { schule: { $regex: search, $options: 'i' } },
                { ort: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const allowedSortFields = ['nachname', 'vorname', 'ort', 'matchScore'];
        let sort;
        if (sortBy && allowedSortFields.includes(sortBy)) {
            const order = sortOrder === 'desc' ? -1 : 1;
            sort = { [sortBy]: order, _id: 1 };
        } else {
            sort = { rp: 1, nachname: 1, vorname: 1 };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [docs, total] = await Promise.all([
            Fachberater.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Fachberater.countDocuments(filter)
        ]);

        res.json({
            data: docs,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fachberater/:id/neighbors - Get prev/next IDs for navigation
router.get('/fachberater/:id/neighbors', async (req, res) => {
    try {
        const doc = await Fachberater.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Not found' });

        const { status, rp, search, sortBy, sortOrder } = req.query;

        const allowedSortFields = ['nachname', 'vorname', 'ort', 'matchScore'];
        let sort;
        if (sortBy && allowedSortFields.includes(sortBy)) {
            const order = sortOrder === 'desc' ? -1 : 1;
            sort = { [sortBy]: order, _id: 1 };
        } else {
            sort = { rp: 1, nachname: 1, vorname: 1, _id: 1 };
        }

        // Build filter for optional status/rp/search filters
        const filter = {};
        if (status) filter.status = status;
        if (rp) filter.rp = rp;
        if (search) {
            filter.$or = [
                { nachname: { $regex: search, $options: 'i' } },
                { vorname: { $regex: search, $options: 'i' } },
                { schule: { $regex: search, $options: 'i' } },
                { ort: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Get all IDs in sort order (only _id field for efficiency)
        const allIds = await Fachberater.find(filter).sort(sort).select('_id').lean();
        const index = allIds.findIndex(d => d._id.toString() === req.params.id);

        res.json({
            prevId: index > 0 ? allIds[index - 1]._id : null,
            nextId: index < allIds.length - 1 ? allIds[index + 1]._id : null,
            index: index,
            total: allIds.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fachberater/:id - Single record
router.get('/fachberater/:id', async (req, res) => {
    try {
        const doc = await Fachberater.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Not found' });
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/fachberater/:id - Update record
router.put('/fachberater/:id', async (req, res) => {
    try {
        const { vorname, nachname, schule, ort, rp, email, anmeldename, faecher, status } = req.body;
        const update = {};

        if (vorname !== undefined) update.vorname = vorname;
        if (nachname !== undefined) update.nachname = nachname;
        if (schule !== undefined) update.schule = schule;
        if (ort !== undefined) update.ort = ort;
        if (rp !== undefined) update.rp = rp;
        if (email !== undefined) update.email = email;
        if (anmeldename !== undefined) update.anmeldename = anmeldename;
        if (faecher !== undefined) update.faecher = faecher;
        if (status !== undefined) update.status = status;

        console.log('[PUT] received status:', JSON.stringify(status));

        // Auto-check completeness
        const doc = await Fachberater.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Not found' });

        const merged = { ...doc.toObject(), ...update };
        if (merged.vorname && merged.nachname && merged.schule && merged.ort &&
            merged.rp && merged.email && merged.faecher && merged.faecher.length > 0) {
            const statusArr = Array.isArray(merged.status) ? merged.status : [merged.status];
            if (statusArr.includes('registriert') && !statusArr.includes('vollstaendig')) {
                if (!update.status) update.status = [...statusArr];
                if (Array.isArray(update.status) && !update.status.includes('vollstaendig')) {
                    update.status.push('vollstaendig');
                }
            }
        }

        console.log('[PUT] saving status:', JSON.stringify(update.status));

        const updated = await Fachberater.findByIdAndUpdate(req.params.id, update, { new: true });
        console.log('[PUT] returned status:', JSON.stringify(updated.status));
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/fachberater - Delete all fachberater
router.delete('/fachberater', async (req, res) => {
    try {
        const result = await Fachberater.deleteMany({});
        res.json({ deleted: result.deletedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
