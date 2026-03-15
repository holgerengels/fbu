/**
 * Migration: Add 'registriert' badge to matched documents missing it.
 * Also adds 'vollstaendig' if all required fields are filled.
 */
const connectDB = require('../db');
const mongoose = require('mongoose');

async function migrate() {
    await connectDB();

    const collection = mongoose.connection.db.collection('fachberaters');

    // Find documents with moodleId but missing 'registriert' badge
    const docs = await collection.find({
        moodleId: { $ne: '', $exists: true },
        status: { $nin: ['registriert'] }
    }).toArray();

    console.log(`Found ${docs.length} matched documents missing 'registriert' badge`);

    let updated = 0;
    for (const doc of docs) {
        const status = Array.isArray(doc.status) ? [...doc.status] : [doc.status || 'neu'];

        // Remove 'neu' and add 'registriert'
        const filtered = status.filter(s => s !== 'neu');
        if (!filtered.includes('registriert')) filtered.push('registriert');

        // Check completeness
        if (doc.vorname && doc.nachname && doc.schule && doc.ort &&
            doc.rp && doc.email && doc.faecher && doc.faecher.length > 0) {
            if (!filtered.includes('vollstaendig')) filtered.push('vollstaendig');
        }

        await collection.updateOne({ _id: doc._id }, { $set: { status: filtered } });
        console.log(`  ${doc.vorname} ${doc.nachname}: [${filtered.join(', ')}]`);
        updated++;
    }

    console.log(`Updated ${updated} documents`);
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
