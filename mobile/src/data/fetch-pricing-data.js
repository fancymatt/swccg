const fs = require('fs');
const path = require('path');

// Your PriceCharting API token
const API_TOKEN = '1a7e4a9774241c8abeeed5452bcdabef03e9ef6a';
const PRICECHARTING_API_BASE = 'https://www.pricecharting.com/api';

/**
 * Search for a card by name on PriceCharting
 * Returns ALL matching products for the card
 */
async function searchCardPrices(cardName) {
  try {
    // Add "Star Wars CCG" to the search query to narrow results
    const searchQuery = encodeURIComponent(`${cardName} Star Wars CCG`);
    const url = `${PRICECHARTING_API_BASE}/products?t=${API_TOKEN}&q=${searchQuery}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`  API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();

    if (data.products && data.products.length > 0) {
      // Return ALL products that match Star Wars CCG
      return data.products.filter(p =>
        (p['console-name'] && p['console-name'].toLowerCase().includes('star wars')) ||
        (p['product-name'] && p['product-name'].toLowerCase().includes('star wars ccg'))
      );
    }

    return [];
  } catch (error) {
    console.error(`  Error fetching price for "${cardName}":`, error.message);
    return [];
  }
}

/**
 * Get all unique card names from ALL sets
 */
function getCardNamesFromSets() {
  const cardNames = new Set();

  // Get all *-cards.json files in the directory
  const allFiles = fs.readdirSync(__dirname);
  const setFiles = allFiles.filter(f => f.endsWith('-cards.json'));

  console.log(`Found ${setFiles.length} set files:\n`);

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
        console.log(`  ✓ ${data.set.name}: ${data.cards.length} cards`);
      }
    } catch (error) {
      console.error(`  ✗ Error reading ${filename}:`, error.message);
    }
  });

  return Array.from(cardNames).sort();
}

/**
 * Main function to fetch pricing data
 */
async function fetchAllPricing() {
  console.log('Fetching pricing data for ALL Star Wars CCG sets...\n');

  const cardNames = getCardNamesFromSets();
  console.log(`\nFound ${cardNames.length} unique card names across all sets\n`);

  const pricingData = [];
  let totalProductsFound = 0;
  let cardsWithNoData = 0;

  for (let i = 0; i < cardNames.length; i++) {
    const cardName = cardNames[i];
    const progress = `[${i + 1}/${cardNames.length}]`;

    process.stdout.write(`${progress} Fetching "${cardName}"... `);

    const products = await searchCardPrices(cardName);

    // Keep all Star Wars CCG products
    const relevantProducts = products.filter(p => {
      const consoleName = p['console-name'] || '';
      // Accept any product with "Star Wars CCG" in the console name
      return consoleName.toLowerCase().includes('star wars ccg');
    });

    if (relevantProducts.length > 0) {
      console.log(`✓ Found ${relevantProducts.length} product(s)`);

      // Save each product as a separate record
      relevantProducts.forEach(product => {
        const ungradedPrice = product['loose-price'] ? `$${(product['loose-price'] / 100).toFixed(2)}` : 'N/A';
        console.log(`  - ${product['product-name']} (${product['console-name']}) - Ungraded: ${ungradedPrice}`);

        pricingData.push({
          card_name: cardName,
          pc_id: product.id,
          pc_card_name: product['product-name'],
          pc_set_name: product['console-name'],
          ungraded_price: product['loose-price'] || null,
          grade_7_price: product['condition-17-price'] || null,
          grade_8_price: product['condition-18-price'] || null,
          grade_9_price: product['condition-19-price'] || null,
          grade_10_price: product['bgs-10-price'] || null,
          pc_last_updated_time: new Date().toISOString()
        });
      });

      totalProductsFound += relevantProducts.length;
    } else {
      console.log('✗ No products found');
      cardsWithNoData++;
    }

    // Rate limiting - wait 500ms between requests to be respectful
    if (i < cardNames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Save the pricing data to a JSON file
  const outputPath = path.join(__dirname, 'card-pricing-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(pricingData, null, 2), 'utf8');

  console.log(`\n=== Summary ===`);
  console.log(`Total cards searched: ${cardNames.length}`);
  console.log(`Total products found: ${totalProductsFound}`);
  console.log(`Cards with no data: ${cardsWithNoData}`);
  console.log(`\nPricing data saved to: ${outputPath}`);
}

// Run the script
fetchAllPricing().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
