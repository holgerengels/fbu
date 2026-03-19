const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let settingsPath = path.join(__dirname, '../../config/settings.json');
let settings = {};

try {
    if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(data);
    }
} catch (err) {
    console.warn(`[DB] Warning: Error reading settings file: ${err.message}`);
}

if (!settings.database?.url) {
    console.error('[DB] Error: config/settings.json fehlt oder enthält keine database.url');
    process.exit(1);
}
const MONGO_URI = settings.database.url;

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
