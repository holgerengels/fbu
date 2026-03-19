const mongoose = require('mongoose');
const Fachberater = require('./src/models/Fachberater');

async function run() {
    await mongoose.connect('mongodb://admin:password@localhost:27017/fachberater?authSource=admin', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('Connected');

    const fb = new Fachberater({
        vorname: 'Test',
        nachname: 'User',
        status: ['neu']
    });
    await fb.save();

    console.log('Saved fb', fb._id);

    // simulate PUT /api/fachberater/:id
    const update = { status: ['nicht_registriert'] };
    // Mongoose findByIdAndUpdate
    const updated = await Fachberater.findByIdAndUpdate(fb._id, update, { new: true });
    
    console.log('Updated fb', updated.status);
    
    process.exit(0);
}

run().catch(console.error);
