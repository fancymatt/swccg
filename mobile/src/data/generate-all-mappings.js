const fs = require('fs');
const path = require('path');

/**
 * Comprehensive mapping generator for ALL variants
 * Generates mappings with confidence levels for audit
 */

// Load all card data and variants
function getAllVariants() {
  const variants = [];
  const allFiles = fs.readdirSync(__dirname);
  const setFiles = allFiles.filter(f => f.endsWith('-cards.json'));

  setFiles.forEach(filename => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, filename), 'utf8'));
      const setName = data.set.name;
      const setId = data.set.id;

      if (data.cards && Array.isArray(data.cards)) {
        data.cards.forEach(card => {
          // Handle custom variants (if they exist in the JSON)
          if (card.variants && Array.isArray(card.variants)) {
            card.variants.forEach(variant => {
              variants.push({
                variantId: variant.id,
                cardName: card.name,
                setName: setName,
                setId: setId,
                variantType: 'custom',
                variantCode: variant.code,
                variantDetails: variant.details || '',
              });
            });
          } else {
            // Auto-generated variants (Limited and Unlimited)
            variants.push({
              variantId: `${card.id}_limited`,
              cardName: card.name,
              setName: setName,
              setId: setId,
              variantType: 'auto-limited',
              variantCode: 'Limited',
              variantDetails: 'Limited edition',
            });
            variants.push({
              variantId: `${card.id}_unlimited`,
              cardName: card.name,
              setName: setName,
              setId: setId,
              variantType: 'auto-unlimited',
              variantCode: 'Unlimited',
              variantDetails: 'Unlimited edition',
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
  try {
    const filepath = path.join(__dirname, 'card-pricing-data.json');
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (error) {
    console.error('Error reading pricing data:', error.message);
    return [];
  }
}

// Map set names from our app to PriceCharting console names
function getPCSetName(setName) {
  const mapping = {
    'Premiere': 'Star Wars CCG Premiere',
    'A New Hope': 'Star Wars CCG A New Hope',
    'Hoth': 'Star Wars CCG Hoth',
    'Dagobah': 'Star Wars CCG Dagobah',
    'Cloud City': 'Star Wars CCG Cloud City',
    'Jabba\'s Palace': 'Star Wars CCG Jabba\'s Palace',
    'Special Edition': 'Star Wars CCG Special Edition',
    'Endor': 'Star Wars CCG Endor',
    'Death Star II': 'Star Wars CCG Death Star II',
    'Tatooine': 'Star Wars CCG Tatooine',
    'Coruscant': 'Star Wars CCG Coruscant',
    'Theed Palace': 'Star Wars CCG Theed Palace',
    'Reflections I': 'Star Wars CCG Reflections',
    'Reflections II': 'Star Wars CCG Reflections II',
    'Reflections III': 'Star Wars CCG Reflections III',
    'Premiere Introductory 2-Player Game': 'Star Wars CCG Premiere 2-Player',
    'Empire Strikes Back Intro 2-Player': 'Star Wars CCG Empire Strikes Back 2-Player',
    'First Anthology': 'Star Wars CCG First Anthology',
    'Second Anthology': 'Star Wars CCG Second Anthology',
    'Third Anthology': 'Star Wars CCG Third Anthology',
    'Jedi Pack': 'Star Wars CCG Jedi Pack',
    'Rebel Leader Pack': 'Star Wars CCG Rebel Leader Pack',
    'Enhanced Premiere': 'Star Wars CCG Enhanced Premiere',
    'Enhanced Cloud City': 'Star Wars CCG Enhanced Cloud City',
    'Enhanced Jabba\'s Palace': 'Star Wars CCG Enhanced Jabba\'s Palace',
    'Jabba\'s Palace Sealed Deck': 'Star Wars CCG Jabba\'s Palace Official Tournament',
    'Official Tournament Sealed Deck': 'Star Wars CCG Official Tournament',
  };

  return mapping[setName] || setName;
}

// Determine expected PC card name pattern
function getExpectedPCPattern(variant) {
  const patterns = [];

  // Check variant details for clues
  const details = (variant.variantDetails || '').toLowerCase();
  const code = (variant.variantCode || '').toLowerCase();

  // Foil variants
  if (details.includes('foil') || code.includes('foil')) {
    patterns.push({ pattern: '[Foil]', type: 'foil' });
  }

  // Limited/Revised/Unlimited
  if (code === 'limited' || details.includes('limited')) {
    patterns.push({ pattern: '[Limited]', type: 'limited' });
  }
  if (code === 'revised' || details.includes('revised')) {
    patterns.push({ pattern: '[Revised]', type: 'revised' });
  }
  if (code === 'unlimited' || details.includes('unlimited')) {
    // Unlimited usually has no suffix in PriceCharting
    patterns.push({ pattern: '', type: 'unlimited' });
  }

  // If no pattern found, default based on variant type
  if (patterns.length === 0) {
    if (variant.variantType === 'auto-limited') {
      patterns.push({ pattern: '[Limited]', type: 'limited' });
    } else if (variant.variantType === 'auto-unlimited') {
      patterns.push({ pattern: '', type: 'unlimited' });
    }
  }

  return patterns;
}

// Match variant to pricing records with confidence scoring
function matchVariantToPricing(variant, pricingRecords) {
  // Find all pricing records for this card name
  const cardPricing = pricingRecords.filter(p => p.card_name === variant.cardName);

  if (cardPricing.length === 0) {
    return {
      confidence: 'none',
      reason: 'No pricing records found for this card',
      match: null
    };
  }

  // Get expected PriceCharting set name
  const expectedPCSet = getPCSetName(variant.setName);

  // Get expected patterns
  const expectedPatterns = getExpectedPCPattern(variant);

  // Try to find exact match
  for (const pattern of expectedPatterns) {
    const exactMatches = cardPricing.filter(p => {
      const nameMatch = pattern.pattern === ''
        ? !p.pc_card_name.includes('[') // Unlimited has no brackets
        : p.pc_card_name.includes(pattern.pattern);
      const setMatch = p.pc_set_name === expectedPCSet;
      return nameMatch && setMatch;
    });

    if (exactMatches.length === 1) {
      return {
        confidence: 'high',
        reason: `Exact match: ${pattern.type} edition in ${expectedPCSet}`,
        match: exactMatches[0],
        alternatives: []
      };
    } else if (exactMatches.length > 1) {
      return {
        confidence: 'medium',
        reason: `Multiple exact matches found (${exactMatches.length}), using first`,
        match: exactMatches[0],
        alternatives: exactMatches.slice(1, 3)
      };
    }
  }

  // Try set match only (ignore variant pattern)
  const setMatches = cardPricing.filter(p => p.pc_set_name === expectedPCSet);
  if (setMatches.length === 1) {
    return {
      confidence: 'medium',
      reason: `Single match in correct set, but variant type unclear`,
      match: setMatches[0],
      alternatives: []
    };
  } else if (setMatches.length > 1) {
    // Try to pick best match based on pattern
    for (const pattern of expectedPatterns) {
      const patternMatches = setMatches.filter(p => {
        const nameMatch = pattern.pattern === ''
          ? !p.pc_card_name.includes('[')
          : p.pc_card_name.includes(pattern.pattern);
        return nameMatch;
      });
      if (patternMatches.length > 0) {
        return {
          confidence: 'medium',
          reason: `Matched ${pattern.type} in set with ${patternMatches.length} options, using first`,
          match: patternMatches[0],
          alternatives: patternMatches.slice(1, 3)
        };
      }
    }

    // No pattern match, use first set match
    return {
      confidence: 'low',
      reason: `Multiple matches in set (${setMatches.length}), variant type uncertain`,
      match: setMatches[0],
      alternatives: setMatches.slice(1, 3)
    };
  }

  // Try pattern match only (ignore set)
  for (const pattern of expectedPatterns) {
    const patternMatches = cardPricing.filter(p => {
      const nameMatch = pattern.pattern === ''
        ? !p.pc_card_name.includes('[')
        : p.pc_card_name.includes(pattern.pattern);
      return nameMatch;
    });
    if (patternMatches.length === 1) {
      return {
        confidence: 'medium',
        reason: `Matched ${pattern.type} edition, but set name differs`,
        match: patternMatches[0],
        alternatives: []
      };
    } else if (patternMatches.length > 1) {
      return {
        confidence: 'low',
        reason: `Multiple ${pattern.type} matches (${patternMatches.length}), set unclear`,
        match: patternMatches[0],
        alternatives: patternMatches.slice(1, 3)
      };
    }
  }

  // Fallback: just pick first pricing record
  return {
    confidence: 'low',
    reason: `No clear match, using first of ${cardPricing.length} available`,
    match: cardPricing[0],
    alternatives: cardPricing.slice(1, 3)
  };
}

// Main function
function generateAllMappings() {
  console.log('Generating comprehensive variant-to-pricing mappings...\n');

  const variants = getAllVariants();
  const pricingRecords = loadPricingData();

  console.log(`Total variants to map: ${variants.length}`);
  console.log(`Total pricing records: ${pricingRecords.length}\n`);

  const results = {
    high: [],
    medium: [],
    low: [],
    none: []
  };

  const mappings = {};

  variants.forEach((variant, index) => {
    if ((index + 1) % 500 === 0) {
      console.log(`Processing variant ${index + 1}/${variants.length}...`);
    }

    const result = matchVariantToPricing(variant, pricingRecords);

    const entry = {
      variantId: variant.variantId,
      cardName: variant.cardName,
      setName: variant.setName,
      variantType: variant.variantType,
      variantCode: variant.variantCode,
      confidence: result.confidence,
      reason: result.reason,
      match: result.match ? {
        pc_id: result.match.pc_id,
        pc_card_name: result.match.pc_card_name,
        pc_set_name: result.match.pc_set_name,
        price: result.match.ungraded_price
      } : null,
      alternatives: result.alternatives || []
    };

    results[result.confidence].push(entry);

    if (result.match) {
      mappings[variant.variantId] = result.match.pc_id;
    }
  });

  console.log('\n=== RESULTS ===');
  console.log(`High confidence: ${results.high.length} (${((results.high.length / variants.length) * 100).toFixed(1)}%)`);
  console.log(`Medium confidence: ${results.medium.length} (${((results.medium.length / variants.length) * 100).toFixed(1)}%)`);
  console.log(`Low confidence: ${results.low.length} (${((results.low.length / variants.length) * 100).toFixed(1)}%)`);
  console.log(`No match: ${results.none.length} (${((results.none.length / variants.length) * 100).toFixed(1)}%)`);
  console.log(`Total mappings generated: ${Object.keys(mappings).length}`);

  // Save comprehensive audit file
  const auditPath = path.join(__dirname, 'mapping-audit.json');
  fs.writeFileSync(auditPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nAudit file saved to: ${auditPath}`);

  // Save mappings
  const mappingsPath = path.join(__dirname, 'variant-pricing-mappings.json');
  fs.writeFileSync(
    mappingsPath,
    JSON.stringify({ mappings }, null, 2),
    'utf8'
  );
  console.log(`Mappings saved to: ${mappingsPath}`);

  // Save flagged items for review (medium and low confidence)
  const flagged = [...results.medium, ...results.low];
  const flaggedPath = path.join(__dirname, 'mappings-for-review.json');
  fs.writeFileSync(flaggedPath, JSON.stringify(flagged, null, 2), 'utf8');
  console.log(`Flagged mappings for review (${flagged.length}) saved to: ${flaggedPath}`);

  // Show some examples of each confidence level
  console.log('\n=== SAMPLE HIGH CONFIDENCE (first 5) ===');
  results.high.slice(0, 5).forEach(r => {
    console.log(`${r.cardName} (${r.variantCode})`);
    console.log(`  → ${r.match.pc_card_name} (${r.match.pc_set_name})`);
    console.log(`  Reason: ${r.reason}\n`);
  });

  console.log('=== SAMPLE MEDIUM CONFIDENCE (first 5) ===');
  results.medium.slice(0, 5).forEach(r => {
    console.log(`${r.cardName} (${r.variantCode})`);
    console.log(`  → ${r.match.pc_card_name} (${r.match.pc_set_name})`);
    console.log(`  Reason: ${r.reason}\n`);
  });

  console.log('=== SAMPLE LOW CONFIDENCE (first 5) ===');
  results.low.slice(0, 5).forEach(r => {
    console.log(`${r.cardName} (${r.variantCode})`);
    console.log(`  → ${r.match.pc_card_name} (${r.match.pc_set_name})`);
    console.log(`  Reason: ${r.reason}`);
    if (r.alternatives.length > 0) {
      console.log(`  Alternatives:`, r.alternatives.map(a => a.pc_card_name).join(', '));
    }
    console.log();
  });

  return {
    mappings,
    results
  };
}

// Run the script
generateAllMappings();
