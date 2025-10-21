const fs = require('fs');
const path = require('path');

/**
 * Generate pricing mappings for Premiere Limited variants
 * Since Premiere cards don't have custom variants, they have auto-generated
 * variants with IDs like pm_001_5d6-ra-7_limited
 */

// Load premiere cards
function getPremiereCards() {
  const filepath = path.join(__dirname, 'premiere-cards.json');
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  return data.cards;
}

// Load pricing data
function loadPricingData() {
  const filepath = path.join(__dirname, 'card-pricing-data.json');
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  return data;
}

// Main
function generatePremiereMappings() {
  const cards = getPremiereCards();
  const pricingData = loadPricingData();

  const mappings = {};
  let mapped = 0;
  let multipleMatches = 0;
  let noMatch = 0;

  console.log(`Processing ${cards.length} Premiere cards...\n`);

  cards.forEach(card => {
    // Auto-generated variant ID for Premiere Limited
    const variantId = `${card.id}_limited`;

    // Find matching pricing records
    const matches = pricingData.filter(p =>
      p.card_name === card.name &&
      p.pc_set_name === 'Star Wars CCG Premiere' &&
      p.pc_card_name.includes('[Limited]')
    );

    if (matches.length === 1) {
      mappings[variantId] = matches[0].pc_id;
      mapped++;
    } else if (matches.length > 1) {
      // Take the first match
      mappings[variantId] = matches[0].pc_id;
      console.log(`Warning: Multiple matches for "${card.name}", using first match`);
      multipleMatches++;
    } else {
      console.log(`No match found for "${card.name}"`);
      noMatch++;
    }
  });

  console.log(`\n=== RESULTS ===`);
  console.log(`Successfully mapped: ${mapped}`);
  console.log(`Multiple matches (took first): ${multipleMatches}`);
  console.log(`No matches: ${noMatch}`);
  console.log(`Total mappings: ${Object.keys(mappings).length}`);

  // Save mappings
  const outputPath = path.join(__dirname, 'premiere-limited-mappings.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ mappings }, null, 2),
    'utf8'
  );

  console.log(`\nMappings saved to: ${outputPath}`);
  return mappings;
}

generatePremiereMappings();
