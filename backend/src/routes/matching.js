const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Fachberater = require('../models/Fachberater');
const MoodleProfile = require('../models/MoodleProfile');
const { findCandidates, findUniqueMatches } = require('../services/matching');

let settingsPath = path.join(__dirname, '../../../config/settings.json');
let settings = {};
try {
    if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
} catch (err) { /* ignore */ }

const matchingConfig = settings.matching || {};

// GET /api/matching/:id/candidates - Get match candidates for a fachberater
router.get('/matching/:id/candidates', async (req, res) => {
    try {
        const fb = await Fachberater.findById(req.params.id);
        if (!fb) return res.status(404).json({ error: 'Fachberater not found' });

        const topN = parseInt(req.query.topN) || matchingConfig.topN || 5;

        // Collect moodleIds already linked to other Fachberater (exclude current)
        const linkedFbs = await Fachberater.find(
            { moodleId: { $exists: true, $ne: '' }, _id: { $ne: fb._id } },
            { moodleId: 1 }
        ).lean();
        const linkedMoodleIds = new Set(linkedFbs.map(f => f.moodleId));

        const allProfiles = await MoodleProfile.find().lean();
        const moodleProfiles = allProfiles.filter(mp => !linkedMoodleIds.has(mp.moodleId));

        const candidates = findCandidates(fb, moodleProfiles, topN, false);

        res.json({
            fachberater: fb,
            candidates: candidates.map(c => ({
                ...c.profile,
                score: Math.round(c.score * 10000) / 10000
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/matching/:id/confirm - Confirm a match
router.post('/matching/:id/confirm', async (req, res) => {
    try {
        const fb = await Fachberater.findById(req.params.id);
        if (!fb) return res.status(404).json({ error: 'Fachberater not found' });

        const { moodleProfileId, score } = req.body;
        const mp = await MoodleProfile.findById(moodleProfileId);
        if (!mp) return res.status(404).json({ error: 'MoodleProfile not found' });

        // Merge Moodle data into Fachberater
        const moodleFaecher = mp.faecher || [];
        const existingFaecher = fb.faecher || [];
        const mergedFaecher = [...new Set([...existingFaecher, ...moodleFaecher])].filter(Boolean);

        const update = {
            moodleId: mp.moodleId,
            anmeldename: mp.anmeldename || fb.anmeldename,
            email: mp.email || fb.email,
            faecher: mergedFaecher,
            moodleData: mp.toObject(),
            matchScore: score || 0
        };

        // Build status badges
        const statusBadges = new Set((fb.status || []).filter(s => s !== 'neu'));
        statusBadges.add('registriert');
        // Check completeness after merge
        const merged = { ...fb.toObject(), ...update };
        if (merged.vorname && merged.nachname && merged.schule && merged.ort &&
            merged.rp && merged.email && merged.faecher && merged.faecher.length > 0) {
            statusBadges.add('vollstaendig');
        }
        update.status = [...statusBadges];

        const updated = await Fachberater.findByIdAndUpdate(req.params.id, update, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/matching/:id/reject - Mark as not registered
router.post('/matching/:id/reject', async (req, res) => {
    try {
        const updated = await Fachberater.findByIdAndUpdate(
            req.params.id,
            { $set: { status: ['nicht_registriert'] } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/matching/auto - Auto-match all unique matches
router.post('/matching/auto', async (req, res) => {
    try {
        const threshold = parseFloat(req.body.threshold) || matchingConfig.threshold || 0.85;
        const fachberaterList = await Fachberater.find({ status: 'neu' }).lean();

        // Exclude MoodleProfiles already linked to any Fachberater
        const linkedFbs = await Fachberater.find(
            { moodleId: { $exists: true, $ne: '' } },
            { moodleId: 1 }
        ).lean();
        const linkedMoodleIds = new Set(linkedFbs.map(f => f.moodleId));

        const allProfiles = await MoodleProfile.find().lean();
        const moodleProfiles = allProfiles.filter(mp => !linkedMoodleIds.has(mp.moodleId));

        const matches = findUniqueMatches(fachberaterList, moodleProfiles, threshold);

        let matched = 0;
        for (const m of matches) {
            const moodleFaecher = m.moodleProfile.faecher || [];
            const existingFaecher = m.fachberater.faecher || [];
            const mergedFaecher = [...new Set([...existingFaecher, ...moodleFaecher])].filter(Boolean);

            const update = {
                moodleId: m.moodleProfile.moodleId,
                anmeldename: m.moodleProfile.anmeldename || '',
                email: m.moodleProfile.email || '',
                faecher: mergedFaecher,
                moodleData: m.moodleProfile,
                matchScore: m.score
            };

            // Build status badges
            const statusBadges = new Set((m.fachberater.status || []).filter(s => s !== 'neu'));
            statusBadges.add('registriert');
            const merged = { ...m.fachberater, ...update };
            if (merged.vorname && merged.nachname && merged.schule && merged.ort &&
                merged.rp && merged.email && merged.faecher && merged.faecher.length > 0) {
                statusBadges.add('vollstaendig');
            }
            update.status = [...statusBadges];

            await Fachberater.findByIdAndUpdate(m.fachberater._id, update);
            matched++;
        }

        res.json({
            matched,
            totalNeu: fachberaterList.length,
            totalMoodle: moodleProfiles.length,
            threshold
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
