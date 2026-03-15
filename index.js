const fs = require('fs');
const csv = require('csv-parser');
const natural = require('natural');

// Initialize tokenizer (unused for now but good to have) and distance metric
const jaroWinkler = natural.JaroWinklerDistance;

const dataRows = [];

// 1. Load the reference data (data.csv)
fs.createReadStream('data.csv')
  .on('error', (err) => {
    console.error('Error reading data.csv:', err);
    process.exit(1);
  })
  .pipe(csv({
    mapHeaders: ({ header, index }) => header.trim().replace(/^\uFEFF/, '')
  }))
  .on('error', (err) => {
    console.error('Error parsing data.csv:', err);
  })
  .on('data', (row) => {
    const rowText = `${row.Vorname || ''} ${row.Nachname || ''} ${row.Schulname || ''} ${row.Schulort || ''}`.trim();
    dataRows.push({
      original: row,
      text: rowText
    });
  })
  .on('end', () => {
    // console.error(`Loaded ${dataRows.length} reference records.`);
    processInput();
  });

function processInput() {
  console.log('Score;RP;Input_Nachname;Input_Vorname;Input_Schule;Match_Nachname;Match_Vorname;Match_Schule');

  // 2. Process the input data (input.csv)
  fs.createReadStream('input.csv')
    .on('error', (err) => {
      console.error('Error reading input.csv:', err);
      process.exit(1);
    })
    .pipe(csv({
      mapHeaders: ({ header, index }) => header.trim().replace(/^\uFEFF/, '')
    }))
    .on('error', (err) => console.error('Error parsing input.csv:', err))
    .on('data', (row) => {
      const iRP = row['RP'] || '';
      const iNachname = row['Nachname'] || '';
      const iVorname = row['Vorname'] || '';
      const iSchulname = row['Schulname'] || '';
      const iSchulort = row['Schulort'] || '';

      const inputText = `${iVorname} ${iNachname} ${iSchulname} ${iSchulort}`.trim();

      // Find best match
      const bestMatch = dataRows.reduce((best, current) => {
        // RP must match for a valid comparison
        if (current.original['RP'] !== iRP) {
          return best;
        }

        const score = natural.JaroWinklerDistance(inputText, current.text);
        return score > best.score ? { score, record: current } : best;
      }, { score: 0, record: null });

      if (bestMatch.record) {
        // row is input row, bestMatch.record.original is data row
        const match = bestMatch.record.original;
        console.log(`${bestMatch.score.toFixed(4)};"${iRP}";"${iNachname}";"${iVorname}";"${iSchulname}";"${iSchulort}";"${match.Nachname}";"${match.Vorname}";"${match.Schulname}";"${match.Schulort}"`);
      }
    })
    .on('end', () => {
      console.error('Finished processing input.csv');
    });
}
