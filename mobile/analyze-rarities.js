// Script to analyze all distinct rarity values in the card data
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'src', 'data');

// All card data files
const cardFiles = [
  'premiere-cards.json',
  'a-new-hope-cards.json',
  'hoth-cards.json',
  'dagobah-cards.json',
  'cloud-city-cards.json',
  'jabbas-palace-cards.json',
  'special-edition-cards.json',
  'endor-cards.json',
  'death-star-ii-cards.json',
  'tatooine-cards.json',
  'coruscant-cards.json',
  'theed-palace-cards.json',
  'reflections-i-cards.json',
  'reflections-ii-cards.json',
  'reflections-iii-cards.json',
  'enhanced-premiere-cards.json',
  'enhanced-cloud-city-cards.json',
  'enhanced-jabbas-palace-cards.json',
  'first-anthology-cards.json',
  'second-anthology-cards.json',
  'third-anthology-cards.json',
  'premiere-two-player-cards.json',
  'empire-two-player-cards.json',
  'tournament-sealed-deck-cards.json',
  'jabbas-palace-sealed-deck-cards.json',
  'jedi-pack-cards.json',
  'rebel-leader-pack-cards.json',
  'promotional-foils-cards.json',
];

const raritySet = new Set();
const rarityToSets = {};
const rarityExamples = {};

cardFiles.forEach(filename => {
  try {
    const filePath = path.join(dataDir, filename);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.cards && Array.isArray(data.cards)) {
      data.cards.forEach(card => {
        if (card.rarity) {
          raritySet.add(card.rarity);

          // Track which sets have this rarity
          if (!rarityToSets[card.rarity]) {
            rarityToSets[card.rarity] = new Set();
            rarityExamples[card.rarity] = [];
          }
          rarityToSets[card.rarity].add(data.set.name);

          // Store a few examples (max 3)
          if (rarityExamples[card.rarity].length < 3) {
            rarityExamples[card.rarity].push({
              name: card.name,
              set: data.set.name,
              number: card.number
            });
          }
        }
      });
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
  }
});

// Sort rarities alphabetically
const sortedRarities = Array.from(raritySet).sort();

console.log('\n========================================');
console.log('RARITY ANALYSIS');
console.log('========================================\n');
console.log(`Total distinct rarity values: ${sortedRarities.length}\n`);

// Group by prefix
const rarityGroups = {};
sortedRarities.forEach(rarity => {
  const prefix = rarity.charAt(0).toUpperCase();
  if (!rarityGroups[prefix]) {
    rarityGroups[prefix] = [];
  }
  rarityGroups[prefix].push(rarity);
});

// Display by group
Object.keys(rarityGroups).sort().forEach(prefix => {
  console.log(`\n${prefix}-prefix rarities (${rarityGroups[prefix].length}):`);
  console.log('─'.repeat(60));

  rarityGroups[prefix].forEach(rarity => {
    const sets = Array.from(rarityToSets[rarity]);
    const examples = rarityExamples[rarity];

    console.log(`\n  "${rarity}"`);
    console.log(`    Found in ${sets.length} set(s): ${sets.slice(0, 3).join(', ')}${sets.length > 3 ? '...' : ''}`);
    console.log(`    Examples:`);
    examples.forEach(ex => {
      console.log(`      • ${ex.name} (${ex.set} #${ex.number})`);
    });
  });
});

// Summary by likely category
console.log('\n\n========================================');
console.log('SUGGESTED CATEGORIZATION');
console.log('========================================\n');

const categorization = {
  'Common': rarityGroups['C'] || [],
  'Uncommon': rarityGroups['U'] || [],
  'Rare': rarityGroups['R'] || [],
  'Fixed': rarityGroups['F'] || [],
  'Promo/Premium': (rarityGroups['P'] || []).concat(rarityGroups['M'] || []),
  'Other': []
};

// Catch any that don't start with C, U, R, F, P, M
Object.keys(rarityGroups).forEach(prefix => {
  if (!['C', 'U', 'R', 'F', 'P', 'M'].includes(prefix)) {
    categorization['Other'] = categorization['Other'].concat(rarityGroups[prefix]);
  }
});

Object.entries(categorization).forEach(([category, rarities]) => {
  if (rarities.length > 0) {
    console.log(`${category}:`);
    console.log(`  ${rarities.join(', ')}`);
    console.log('');
  }
});

console.log('\n========================================\n');
