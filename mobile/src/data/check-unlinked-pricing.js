const fs = require('fs');
const path = require('path');

/**
 * This script analyzes the pricing data and identifies records that don't
 * match any cards in our encyclopedia. This helps identify which PriceCharting
 * products need manual mapping to our card variants.
 */

// Load all card names from all sets
function getAllCardNames() {
  const cardNames = new Set();
  const setFiles = [
    'premiere-cards.json',
    'reflections-i-cards.json',
    'reflections-ii-cards.json',
    'reflections-iii-cards.json'
  ];

  setFiles.forEach(filename => {
    const filepath = path.join(__dirname, filename);
    try {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      if (data.cards && Array.isArray(data.cards)) {
        data.cards.forEach(card => {
          if (card.name) {
            cardNames.add(card.name);
          }
        });
      }
    } catch (error) {
      console.error(`Error reading ${filename}:`, error.message);
    }
  });

  return cardNames;
}

// Load pricing data
function loadPricingData() {
  const filepath = path.join(__dirname, 'card-pricing-data.json');
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return data;
  } catch (error) {
    console.error('Error reading card-pricing-data.json:', error.message);
    return [];
  }
}

// Main analysis
function analyzeUnlinkedPricing() {
  console.log('Analyzing pricing data for unlinked records...\n');

  const cardNames = getAllCardNames();
  const pricingData = loadPricingData();

  console.log(`Encyclopedia cards: ${cardNames.size}`);
  console.log(`Pricing records: ${pricingData.length}\n`);

  // Find unlinked records
  const unlinked = pricingData.filter(record => !cardNames.has(record.card_name));

  console.log(`Unlinked records: ${unlinked.length}`);
  console.log(`Linked records: ${pricingData.length - unlinked.length}\n`);

  if (unlinked.length > 0) {
    console.log('=== UNLINKED PRICING RECORDS ===\n');

    // Group by set for easier review
    const bySet = {};
    unlinked.forEach(record => {
      const setName = record.pc_set_name || 'Unknown';
      if (!bySet[setName]) {
        bySet[setName] = [];
      }
      bySet[setName].push(record);
    });

    // Print by set
    Object.keys(bySet).sort().forEach(setName => {
      console.log(`\n--- ${setName} (${bySet[setName].length} records) ---`);
      bySet[setName].forEach(record => {
        const price = record.ungraded_price
          ? `$${(record.ungraded_price / 100).toFixed(2)}`
          : 'N/A';
        console.log(`  [${record.pc_id}] ${record.pc_card_name}`);
        console.log(`      Search name: "${record.card_name}"`);
        console.log(`      Price: ${price}`);
      });
    });

    // Save detailed report to file
    const reportPath = path.join(__dirname, 'unlinked-pricing-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(unlinked, null, 2), 'utf8');
    console.log(`\n\nDetailed report saved to: ${reportPath}`);
  }

  // Also show linked records summary by set
  const linked = pricingData.filter(record => cardNames.has(record.card_name));
  const linkedBySet = {};
  linked.forEach(record => {
    const setName = record.pc_set_name || 'Unknown';
    linkedBySet[setName] = (linkedBySet[setName] || 0) + 1;
  });

  console.log('\n\n=== LINKED RECORDS BY SET ===');
  Object.keys(linkedBySet).sort().forEach(setName => {
    console.log(`  ${setName}: ${linkedBySet[setName]} records`);
  });
}

// Run the analysis
analyzeUnlinkedPricing();
