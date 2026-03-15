/**
 * Migration: Convert status from String to Array
 * Uses the same DB connection as the backend.
 */
const connectDB = require('../db');
const mongoose = require('mongoose');

async function migrate() {
    await connectDB();

    const collection = mongoose.connection.db.collection('fachberaters');

    // Find all documents where status is a string (not an array)
    const docs = await collection.find({ status: { $type: 'string' } }).toArray();
    console.log(`Found ${docs.length} documents with string status`);

    let updated = 0;
    for (const doc of docs) {
        await collection.updateOne(
            { _id: doc._id },
            { $set: { status: [doc.status] } }
        );
        updated++;
    }

    console.log(`Migrated ${updated} documents`);
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
