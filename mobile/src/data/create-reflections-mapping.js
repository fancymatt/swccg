const fs = require('fs');
const path = require('path');

// Get the data directory
const dataDir = __dirname;

// Read Reflections I cards
const reflectionsI = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'reflections-i-cards.json'), 'utf8')
);

// Get all card files except reflections sets
const allFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('-cards.json'));
const cardFiles = allFiles.filter(f => 
  !f.includes('reflections-i') && 
  !f.includes('reflections-ii') && 
  !f.includes('reflections-iii')
);

// Build a map of card names to card data with release dates
const cardNameMap = new Map();
const setReleaseMap = new Map();

console.log(`Processing ${cardFiles.length} set files...`);

// Process all card files
cardFiles.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
  const releaseDate = new Date(data.set.releaseDate).getTime();
  setReleaseMap.set(data.set.id, releaseDate);
  
  data.cards.forEach(card => {
    const cardName = card.name.toLowerCase().trim();
    
    // If this card hasn't been seen or this set is earlier
    if (!cardNameMap.has(cardName)) {
      cardNameMap.set(cardName, {
        name: card.name,
        id: card.id,
        side: card.side,
        type: card.type,
        setId: data.set.id,
        releaseDate: releaseDate
      });
    } else {
      const existing = cardNameMap.get(cardName);
      if (releaseDate < existing.releaseDate) {
        cardNameMap.set(cardName, {
          name: card.name,
          id: card.id,
          side: card.side,
          type: card.type,
          setId: data.set.id,
          releaseDate: releaseDate
        });
      }
    }
  });
});

console.log(`Built map with ${cardNameMap.size} unique cards from source sets`);

// Now map Reflections I cards
const mapping = {};
let found = 0;
let notFound = [];

reflectionsI.cards.forEach(card => {
  const cardName = card.name.toLowerCase().trim();
  
  if (cardNameMap.has(cardName)) {
    const source = cardNameMap.get(cardName);
    mapping[card.name] = {
      id: source.id,
      side: source.side,
      type: source.type,
      originalSet: source.setId
    };
    found++;
  } else {
    mapping[card.name] = {
      id: 'NOT_FOUND',
      side: card.side,
      type: card.type
    };
    notFound.push(card.name);
  }
});

// Write the mapping file
fs.writeFileSync(
  path.join(dataDir, 'reflections-i-id-mapping.json'),
  JSON.stringify(mapping, null, 2)
);

console.log('\n=== MAPPING COMPLETE ===');
console.log(`Successfully mapped: ${found} cards`);
console.log(`Not found: ${notFound.length} cards`);

if (notFound.length > 0) {
  console.log('\nCards not found:');
  notFound.forEach(name => console.log(`  - ${name}`));
}

console.log(`\nMapping file written to: ${path.join(dataDir, 'reflections-i-id-mapping.json')}`);
