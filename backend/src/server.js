const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./db');
const fachberaterRoutes = require('./routes/fachberater');
const importRoutes = require('./routes/import');
const matchingRoutes = require('./routes/matching');
const syncRoutes = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// DB
connectDB();

// Serve Static Frontend (for Docker/Production)
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', fachberaterRoutes);
app.use('/api', importRoutes);
app.use('/api', matchingRoutes);
app.use('/api', syncRoutes);

// SPA Catch-All
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
