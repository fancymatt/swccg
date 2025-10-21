const fs = require('fs');
const path = require('path');

/**
 * This script analyzes variants and helps identify which ones need pricing mappings.
 * It shows:
 * 1. How many variants exist
 * 2. How many have pricing data available (by card name match)
 * 3. Suggests possible pc_id mappings based on card name and variant details
 */

// Load all variants from all sets
function getAllVariants() {
  const variants = [];
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
          if (card.variants && Array.isArray(card.variants)) {
            card.variants.forEach(variant => {
              variants.push({
                variantId: variant.id,
                cardName: card.name,
                variantName: variant.name,
                variantCode: variant.code,
                variantDetails: variant.details || '',
                setName: data.set.name
              });
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error reading ${filename}:`, error.message);
    }
  });

  return variants;
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

// Load existing mappings
function loadExistingMappings() {
  const filepath = path.join(__dirname, 'variant-pricing-mappings.json');
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return data.mappings || {};
  } catch (error) {
    return {};
  }
}

// Try to intelligently match variants to pricing
function suggestMapping(variant, pricingRecords) {
  // Find all pricing records for this card name
  const cardPricing = pricingRecords.filter(p => p.card_name === variant.cardName);

  if (cardPricing.length === 0) {
    return null; // No pricing available for this card
  }

  if (cardPricing.length === 1) {
    // Only one pricing record - perfect match
    return {
      confidence: 'high',
      pc_id: cardPricing[0].pc_id,
      pc_card_name: cardPricing[0].pc_card_name,
      pc_set_name: cardPricing[0].pc_set_name,
      reason: 'Only one pricing record available'
    };
  }

  // Multiple pricing records - try to match by variant details
  const variantLower = variant.variantDetails.toLowerCase();
  const setNameLower = variant.setName.toLowerCase();

  // Check for foil matches
  if (variantLower.includes('foil')) {
    const foilMatches = cardPricing.filter(p =>
      p.pc_card_name.toLowerCase().includes('foil')
    );

    // Further filter by set if possible
    const setMatches = foilMatches.filter(p => {
      const pcSetLower = p.pc_set_name.toLowerCase();
      return pcSetLower.includes(setNameLower) ||
             (setNameLower.includes('reflections i') && pcSetLower.includes('reflections') && !pcSetLower.includes('ii') && !pcSetLower.includes('iii'));
    });

    if (setMatches.length === 1) {
      return {
        confidence: 'high',
        pc_id: setMatches[0].pc_id,
        pc_card_name: setMatches[0].pc_card_name,
        pc_set_name: setMatches[0].pc_set_name,
        reason: 'Matched foil variant by set'
      };
    } else if (foilMatches.length === 1) {
      return {
        confidence: 'medium',
        pc_id: foilMatches[0].pc_id,
        pc_card_name: foilMatches[0].pc_card_name,
        pc_set_name: foilMatches[0].pc_set_name,
        reason: 'Matched foil variant (set unclear)'
      };
    }
  }

  // Check for Limited edition matches (Premiere)
  if (variantLower.includes('limited') || variant.setName === 'Premiere') {
    const limitedMatches = cardPricing.filter(p =>
      p.pc_card_name.toLowerCase().includes('limited')
    );
    if (limitedMatches.length === 1) {
      return {
        confidence: 'high',
        pc_id: limitedMatches[0].pc_id,
        pc_card_name: limitedMatches[0].pc_card_name,
        pc_set_name: limitedMatches[0].pc_set_name,
        reason: 'Matched Limited edition'
      };
    }
  }

  // Default: return first match with low confidence
  return {
    confidence: 'low',
    pc_id: cardPricing[0].pc_id,
    pc_card_name: cardPricing[0].pc_card_name,
    pc_set_name: cardPricing[0].pc_set_name,
    reason: `Multiple matches (${cardPricing.length}) - needs manual review`,
    alternatives: cardPricing.slice(1, 4).map(p => ({
      pc_id: p.pc_id,
      pc_card_name: p.pc_card_name,
      pc_set_name: p.pc_set_name
    }))
  };
}

// Main analysis
function analyzeVariantPricing() {
  console.log('Analyzing variant pricing mappings...\n');

  const variants = getAllVariants();
  const pricingRecords = loadPricingData();
  const existingMappings = loadExistingMappings();

  console.log(`Total variants: ${variants.length}`);
  console.log(`Total pricing records: ${pricingRecords.length}`);
  console.log(`Existing mappings: ${Object.keys(existingMappings).length}\n`);

  // Analyze each variant
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  let noPricing = 0;
  let alreadyMapped = 0;

  const suggestions = [];

  variants.forEach(variant => {
    // Check if already mapped
    if (existingMappings[variant.variantId]) {
      alreadyMapped++;
      return;
    }

    const suggestion = suggestMapping(variant, pricingRecords);

    if (!suggestion) {
      noPricing++;
      suggestions.push({
        ...variant,
        status: 'no-pricing',
        suggestion: null
      });
    } else {
      if (suggestion.confidence === 'high') highConfidence++;
      else if (suggestion.confidence === 'medium') mediumConfidence++;
      else lowConfidence++;

      suggestions.push({
        ...variant,
        status: 'needs-mapping',
        suggestion
      });
    }
  });

  console.log('=== MAPPING STATUS ===');
  console.log(`Already mapped: ${alreadyMapped}`);
  console.log(`High confidence suggestions: ${highConfidence}`);
  console.log(`Medium confidence suggestions: ${mediumConfidence}`);
  console.log(`Low confidence suggestions (manual review needed): ${lowConfidence}`);
  console.log(`No pricing available: ${noPricing}`);
  console.log();

  // Save suggestions to file
  const suggestionsPath = path.join(__dirname, 'variant-pricing-suggestions.json');
  fs.writeFileSync(suggestionsPath, JSON.stringify(suggestions, null, 2), 'utf8');
  console.log(`Suggestions saved to: ${suggestionsPath}\n`);

  // Generate auto-mappings for high confidence matches
  const autoMappings = {};
  suggestions
    .filter(s => s.suggestion && s.suggestion.confidence === 'high')
    .forEach(s => {
      autoMappings[s.variantId] = s.suggestion.pc_id;
    });

  if (Object.keys(autoMappings).length > 0) {
    const autoMappingsPath = path.join(__dirname, 'auto-generated-mappings.json');
    fs.writeFileSync(
      autoMappingsPath,
      JSON.stringify({ mappings: autoMappings }, null, 2),
      'utf8'
    );
    console.log(`Auto-generated ${Object.keys(autoMappings).length} high-confidence mappings`);
    console.log(`Saved to: ${autoMappingsPath}`);
    console.log('\nYou can review and merge these into variant-pricing-mappings.json');
  }

  // Show sample of low confidence matches that need review
  const needsReview = suggestions.filter(s => s.suggestion && s.suggestion.confidence === 'low');
  if (needsReview.length > 0) {
    console.log('\n=== SAMPLE OF MAPPINGS NEEDING MANUAL REVIEW (first 10) ===\n');
    needsReview.slice(0, 10).forEach(s => {
      console.log(`Card: ${s.cardName}`);
      console.log(`  Variant: ${s.variantName} (${s.setName})`);
      console.log(`  Variant ID: ${s.variantId}`);
      console.log(`  Suggested: [${s.suggestion.pc_id}] ${s.suggestion.pc_card_name}`);
      console.log(`  Reason: ${s.suggestion.reason}`);
      if (s.suggestion.alternatives) {
        console.log(`  Alternatives:`);
        s.suggestion.alternatives.forEach(alt => {
          console.log(`    - [${alt.pc_id}] ${alt.pc_card_name} (${alt.pc_set_name})`);
        });
      }
      console.log();
    });
  }
}

// Run the analysis
analyzeVariantPricing();
