const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Fachberater = require('../models/Fachberater');
const MoodleProfile = require('../models/MoodleProfile');
const { fetchProfiles } = require('../services/moodle');

// POST /api/import/csv - Import fachberater from CSV
router.post('/import/csv', async (req, res) => {
    try {
        const csvPath = path.join(__dirname, '../../../config/input.csv');
        if (!fs.existsSync(csvPath)) {
            return res.status(400).json({ error: 'input.csv not found in config/' });
        }

        const rows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv({
                    mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
                }))
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject);
        });

        let imported = 0;
        let skipped = 0;

        for (const row of rows) {
            const nachname = (row.Nachname || '').trim();
            const vorname = (row.Vorname || '').trim();
            const schule = (row.Schulname || '').trim();
            const ort = (row.Schulort || '').trim();
            const rp = (row.RP || '').trim();

            if (!nachname && !vorname) {
                skipped++;
                continue;
            }

            // Check for duplicates
            const existing = await Fachberater.findOne({ nachname, vorname, schule });
            if (existing) {
                skipped++;
                continue;
            }

            await Fachberater.create({
                nachname, vorname, schule, ort, rp,
                status: ['neu']
            });
            imported++;
        }

        res.json({ imported, skipped, total: rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/import/moodle - Import profiles from Fachnetz Moodle
router.post('/import/moodle', async (req, res) => {
    try {
        let profiles;

        // Try live Moodle fetch first, fall back to data.csv
        try {
            profiles = await fetchProfiles();
        } catch (moodleErr) {
            console.warn(`[Import] Moodle fetch failed: ${moodleErr.message}, trying data.csv fallback`);

            const csvPath = path.join(__dirname, '../../../config/data.csv');
            if (!fs.existsSync(csvPath)) {
                throw new Error('Neither Moodle nor data.csv available');
            }

            profiles = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(csvPath)
                    .pipe(csv({
                        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
                    }))
                    .on('data', (row) => {
                        profiles.push({
                            moodleId: '',
                            anmeldename: '',
                            vorname: (row.Vorname || '').trim(),
                            nachname: (row.Nachname || '').trim(),
                            email: '',
                            schulname: (row.Schulname || '').trim(),
                            schulort: (row.Schulort || '').trim(),
                            rp: (row.RP || '').trim()
                        });
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        }

        // Store/update profiles in MoodleProfile collection
        let imported = 0;
        let updated = 0;

        for (const p of profiles) {
            if (p.moodleId) {
                const result = await MoodleProfile.findOneAndUpdate(
                    { moodleId: p.moodleId },
                    p,
                    { upsert: true, new: true }
                );
                if (result.createdAt.getTime() === result.updatedAt.getTime()) {
                    imported++;
                } else {
                    updated++;
                }
            } else {
                // Fallback for CSV data (no moodleId) — use composite key
                const existing = await MoodleProfile.findOne({
                    vorname: p.vorname,
                    nachname: p.nachname,
                    schulname: p.schulname
                });
                if (!existing) {
                    p.moodleId = `csv_${p.nachname}_${p.vorname}_${p.schulname}`.replace(/\s+/g, '_');
                    await MoodleProfile.create(p);
                    imported++;
                } else {
                    updated++;
                }
            }
        }

        res.json({ imported, updated, total: profiles.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Subject abbreviation mapping (loaded from config)
const FACH_MAP = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config/fach_map.json'), 'utf8'));

function translateFach(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    // Remove trailing asterisks (e.g. "Informatik*", "Privatschul-Aufsicht*")
    const cleaned = trimmed.replace(/\*+$/, '').trim();
    // Skip administrative notes
    if (/^(Privatschul|RPS|ZSL|OES|Fachleiter|Seminarkurs|Prozess|Mitarbeit)/i.test(cleaned)) return '';
    // Look up abbreviation
    if (FACH_MAP[cleaned]) return FACH_MAP[cleaned];
    if (FACH_MAP[trimmed]) return FACH_MAP[trimmed];
    // Already a full name
    return cleaned;
}

// POST /api/import/kur - Import Fächer from kur.csv and match to existing Fachberater
router.post('/import/kur', async (req, res) => {
    try {
        const csvPath = path.join(__dirname, '../../../config/kur.csv');
        if (!fs.existsSync(csvPath)) {
            return res.status(400).json({ error: 'kur.csv not found in config/' });
        }

        // Parse CSV (no header)
        const raw = fs.readFileSync(csvPath, 'utf8');
        const rows = [];
        // Simple CSV line parser that handles quoted fields
        for (const line of raw.split(/\r?\n/)) {
            if (!line.trim()) continue;
            const fields = [];
            let current = '';
            let inQuotes = false;
            for (const ch of line) {
                if (ch === '"') { inQuotes = !inQuotes; }
                else if (ch === ',' && !inQuotes) { fields.push(current); current = ''; }
                else { current += ch; }
            }
            fields.push(current);
            rows.push(fields);
        }

        // Load all Fachberater for matching
        const fachberater = await Fachberater.find().lean();
        const natural = require('natural');

        let matched = 0;
        let skipped = 0;
        let noMatch = 0;
        const details = [];

        for (const fields of rows) {
            // Extract nachname and vorname (columns 1 and 2)
            const nachname = (fields[1] || '').trim();
            const vorname = (fields[2] || '').trim();
            if (!nachname && !vorname) { skipped++; continue; }

            // Extract Fächer from columns 4, 5, 6 (or 5, 6, 7 for rows with ort)
            // Detect format: if column 0 is empty, it's the abbreviation format
            let rawFaecher;
            if (!fields[0] || !fields[0].trim()) {
                // Tübingen format: empty, nachname, vorname, schule, fach1, fach2, fach3, empty
                rawFaecher = [fields[4], fields[5], fields[6]].map(f => (f || '').trim());
            } else {
                // Stuttgart+ format: email, nachname, vorname, schule, ort, fach1, fach2, fach3
                rawFaecher = [fields[5], fields[6], fields[7]].map(f => (f || '').trim());
            }

            const faecher = rawFaecher.map(translateFach).filter(Boolean);
            if (!faecher.length) { skipped++; continue; }

            // Find best Fachberater match via Jaro-Winkler on Nachname + Vorname
            let bestFb = null;
            let bestScore = 0;
            const kurText = `${vorname} ${nachname}`.toLowerCase();

            for (const fb of fachberater) {
                const fbText = `${fb.vorname} ${fb.nachname}`.toLowerCase();
                const score = natural.JaroWinklerDistance(kurText, fbText);
                if (score > bestScore) {
                    bestScore = score;
                    bestFb = fb;
                }
            }

            if (bestFb && bestScore >= 0.88) {
                // Merge Fächer (deduplicate)
                const existing = bestFb.faecher || [];
                const merged = [...new Set([...existing, ...faecher])];

                await Fachberater.findByIdAndUpdate(bestFb._id, { faecher: merged });
                // Update in-memory for subsequent dedup
                bestFb.faecher = merged;
                matched++;
                details.push({
                    kur: `${vorname} ${nachname}`,
                    fb: `${bestFb.vorname} ${bestFb.nachname}`,
                    score: Math.round(bestScore * 10000) / 10000,
                    faecher: faecher
                });
            } else {
                noMatch++;
            }
        }

        res.json({ matched, skipped, noMatch, total: rows.length, details });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
