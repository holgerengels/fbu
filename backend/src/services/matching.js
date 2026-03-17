const natural = require('natural');
const fs = require('fs');
const path = require('path');

// Load valid Fächer from config
const validFaecher = new Set(
    JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config/faecher.json'), 'utf8'))
);

/**
 * Calculate Jaro-Winkler similarity between a Fachberater and a MoodleProfile.
 * Compares combined text of Vorname + Nachname + Schule + Ort.
 * Adds a +0.05 bonus if a valid Fach from the Fachberater matches the MoodleProfile's first Fach.
 */
function calculateSimilarity(fachberater, moodleProfile) {
    // Exact email match → 100%
    const fbEmail = (fachberater.email || '').trim().toLowerCase();
    const mpEmail = (moodleProfile.email || '').trim().toLowerCase();
    if (fbEmail && mpEmail && fbEmail === mpEmail) {
        return 1.0;
    }

    const fbText = `${fachberater.vorname || ''} ${fachberater.nachname || ''} ${fachberater.schule || ''} ${fachberater.ort || ''}`.trim().toLowerCase();
    const mpText = `${moodleProfile.vorname || ''} ${moodleProfile.nachname || ''} ${moodleProfile.schulname || ''} ${moodleProfile.schulort || ''}`.trim().toLowerCase();

    let score = natural.JaroWinklerDistance(fbText, mpText);

    // Fach-Bonus: if any valid Fachberater-Fach matches the first MoodleProfile-Fach
    const fbFaecher = fachberater.faecher || [];
    const mpFirstFach = (moodleProfile.faecher && moodleProfile.faecher[0]) || '';
    if (fbFaecher.length > 0 && mpFirstFach) {
        const matchingFach = fbFaecher.find(f => validFaecher.has(f) && f === mpFirstFach);
        if (matchingFach) {
            score = Math.min(score + 0.05, 1.0);
        }
    }

    return score;
}

/**
 * Find the top N most similar MoodleProfiles for a given Fachberater.
 * Optionally filters by RP match.
 */
function findCandidates(fachberater, moodleProfiles, topN = 5, requireRpMatch = false) {
    const candidates = [];

    for (const mp of moodleProfiles) {
        if (requireRpMatch && fachberater.rp && mp.rp && fachberater.rp !== mp.rp) {
            continue;
        }

        const score = calculateSimilarity(fachberater, mp);
        candidates.push({
            profile: mp,
            score
        });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, topN);
}

/**
 * Find all unique matches (exactly one candidate above threshold).
 * Returns array of { fachberater, moodleProfile, score } objects.
 */
function findUniqueMatches(fachberaterList, moodleProfiles, threshold = 0.85) {
    const results = [];

    for (const fb of fachberaterList) {
        if (!fb.status || !fb.status.includes('neu')) continue;

        const candidates = findCandidates(fb, moodleProfiles, 5, false);

        // Check if there's exactly one candidate above threshold
        const aboveThreshold = candidates.filter(c => c.score >= threshold);
        if (aboveThreshold.length === 1) {
            results.push({
                fachberater: fb,
                moodleProfile: aboveThreshold[0].profile,
                score: aboveThreshold[0].score
            });
        }
    }

    return results;
}

module.exports = { calculateSimilarity, findCandidates, findUniqueMatches };
