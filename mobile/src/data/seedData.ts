// Seed data for Star Wars CCG sets
// Based on the official Star Wars CCG card list
// ID format: {set-abbreviation}_{card-number}_{card-name-slug}

import premiereCardsData from './premiere-cards.json';
import aNewHopeCardsData from './a-new-hope-cards.json';
import hothCardsData from './hoth-cards.json';
import dagobahCardsData from './dagobah-cards.json';
import jabbasPalaceCardsData from './jabbas-palace-cards.json';
import cloudCityCardsData from './cloud-city-cards.json';
import specialEditionCardsData from './special-edition-cards.json';
import endorCardsData from './endor-cards.json';
import deathStarIICardsData from './death-star-ii-cards.json';
import tatooineCardsData from './tatooine-cards.json';
import coruscantCardsData from './coruscant-cards.json';
import theedPalaceCardsData from './theed-palace-cards.json';
import reflectionsICardsData from './reflections-i-cards.json';
import reflectionsIICardsData from './reflections-ii-cards.json';
import reflectionsIIICardsData from './reflections-iii-cards.json';
import enhancedPremiereCardsData from './enhanced-premiere-cards.json';
import enhancedCloudCityCardsData from './enhanced-cloud-city-cards.json';
import enhancedJabbasPalaceCardsData from './enhanced-jabbas-palace-cards.json';
import firstAnthologyCardsData from './first-anthology-cards.json';
import secondAnthologyCardsData from './second-anthology-cards.json';
import thirdAnthologyCardsData from './third-anthology-cards.json';
import premiereTwoPlayerCardsData from './premiere-two-player-cards.json';
import empireTwoPlayerCardsData from './empire-two-player-cards.json';
import tournamentSealedDeckCardsData from './tournament-sealed-deck-cards.json';
import jabbasPalaceSealedDeckCardsData from './jabbas-palace-sealed-deck-cards.json';
import jediPackCardsData from './jedi-pack-cards.json';
import rebelLeaderPackCardsData from './rebel-leader-pack-cards.json';
import promotionalFoilsCardsData from './promotional-foils-cards.json';

// Combine all set data
const allSetsData = [
  premiereCardsData,
  aNewHopeCardsData,
  hothCardsData,
  cloudCityCardsData,
  dagobahCardsData,
  jabbasPalaceCardsData,
  specialEditionCardsData,
  endorCardsData,
  deathStarIICardsData,
  tatooineCardsData,
  reflectionsICardsData,
  coruscantCardsData,
  theedPalaceCardsData,
  reflectionsIICardsData,
  reflectionsIIICardsData,
  enhancedPremiereCardsData,
  enhancedCloudCityCardsData,
  enhancedJabbasPalaceCardsData,
  firstAnthologyCardsData,
  secondAnthologyCardsData,
  thirdAnthologyCardsData,
  premiereTwoPlayerCardsData,
  empireTwoPlayerCardsData,
  tournamentSealedDeckCardsData,
  jabbasPalaceSealedDeckCardsData,
  jediPackCardsData,
  rebelLeaderPackCardsData,
  promotionalFoilsCardsData,
];

// Export sets - split into Limited and Unlimited editions
// Note: Reflections sets only have Limited versions (no Unlimited)
export const SEED_SETS = allSetsData.flatMap((setData) => {
  const isReflectionsSet = setData.set.id.includes('reflections');

  const limitedSet = {
    id: `${setData.set.id}-limited`,
    name: setData.set.name,
    abbreviation: setData.set.abbreviation,
    release_date: setData.set.releaseDate,
    icon_path: (setData.set as any).iconPath || 'icon_set_default',
  };

  // Reflections sets only have Limited versions
  if (isReflectionsSet) {
    return [limitedSet];
  }

  // All other sets have both Limited and Unlimited versions
  const unlimitedSet = {
    id: `${setData.set.id}-unlimited`,
    name: `${setData.set.name} Unlimited`,
    abbreviation: `${setData.set.abbreviation}-U`,
    // Unlimited sets released approximately 6 months after Limited
    release_date: setData.set.releaseDate ?
      new Date(new Date(setData.set.releaseDate).getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : setData.set.releaseDate,
    icon_path: (setData.set as any).iconPath || 'icon_set_default',
  };

  return [limitedSet, unlimitedSet];
});

// Helper to get variants for a specific set edition
function getVariantsForEdition(card: any, edition: 'limited' | 'unlimited') {
  // If card has custom variants defined, filter by edition
  if (card.variants && Array.isArray(card.variants)) {
    return card.variants.filter((v: any) => {
      const id = v.id.toLowerCase();
      return edition === 'limited' ? id.includes('_limited') : id.includes('_unlimited');
    });
  }

  // Check if card is a foil (indicated by rarity ending with 'F' followed by a number, or starting with 'F')
  // Foil cards: F#, R# (Reflections Foil), T# (Tournament Foil)
  const rarity = card.rarity || '';
  const isFoil = /[FRT]\d/.test(rarity) || rarity.startsWith('F');

  // Otherwise, return standard variant for this edition
  // Limited cards: Black Border (or Black Border Holo if foil)
  // Unlimited cards: White Border (no foils exist for unlimited)
  if (edition === 'limited') {
    return [{
      id: `${card.id}_${edition}`,
      name: isFoil ? 'Black Border Holo' : 'Black Border',
      code: isFoil ? 'BBH' : 'BB',
    }];
  } else {
    return [{
      id: `${card.id}_${edition}`,
      name: 'White Border',
      code: 'WB',
    }];
  }
}

// Cards (set-specific instances)
// Each card instance is specific to either Limited or Unlimited edition
// Note: Reflections sets only have Limited versions
// Deduplicate cards that appear in multiple sets
export const SEED_CARDS = (() => {
  const allCards = allSetsData.flatMap((setData) => {
    const isReflectionsSet = setData.set.id.includes('reflections');

    return setData.cards.flatMap((card) => {
      const limitedCard = {
        id: `${card.id}_limited`,
        name: card.name,
        side: card.side,
        type: card.type,
        icon: (card as any).icon,
      };

      // Reflections sets only have Limited versions
      if (isReflectionsSet) {
        return [limitedCard];
      }

      // All other sets have both Limited and Unlimited versions
      const unlimitedCard = {
        id: `${card.id}_unlimited`,
        name: card.name,
        side: card.side,
        type: card.type,
        icon: (card as any).icon,
      };

      return [limitedCard, unlimitedCard];
    });
  });

  // Deduplicate by card ID
  const cardMap = new Map();
  allCards.forEach(card => {
    if (!cardMap.has(card.id)) {
      cardMap.set(card.id, card);
    }
  });

  return Array.from(cardMap.values());
})();

// Link cards to sets with card numbers and rarities
// Each set gets its edition-specific card instances
// Note: Reflections sets only have Limited versions
export const SEED_SET_CARDS = allSetsData.flatMap((setData) => {
  const isReflectionsSet = setData.set.id.includes('reflections');

  return setData.cards.flatMap((card) => {
    const limitedSetCard = {
      set_id: `${setData.set.id}-limited`,
      card_id: `${card.id}_limited`,
      card_number: card.number,
      rarity: card.rarity,
    };

    // Reflections sets only have Limited versions
    if (isReflectionsSet) {
      return [limitedSetCard];
    }

    // All other sets have both Limited and Unlimited versions
    const unlimitedSetCard = {
      set_id: `${setData.set.id}-unlimited`,
      card_id: `${card.id}_unlimited`,
      card_number: card.number,
      rarity: card.rarity,
    };

    return [limitedSetCard, unlimitedSetCard];
  });
});

// Card variants belong to their specific card instances
// Each card instance only has variants appropriate for its edition
// Note: Reflections sets only have Limited versions
// Deduplicate variants that appear in multiple sets
export const SEED_VARIANTS = (() => {
  const allVariants = allSetsData.flatMap((setData) => {
    const isReflectionsSet = setData.set.id.includes('reflections');

    return setData.cards.flatMap((card: any) => {
      const limitedVariants = getVariantsForEdition(card, 'limited').map((v: any) => ({
        id: v.id,
        card_id: `${card.id}_limited`,
        name: v.name,
        code: v.code,
        details: v.details,
      }));

      // Reflections sets only have Limited versions
      if (isReflectionsSet) {
        return limitedVariants;
      }

      // All other sets have both Limited and Unlimited versions
      const unlimitedVariants = getVariantsForEdition(card, 'unlimited').map((v: any) => ({
        id: v.id,
        card_id: `${card.id}_unlimited`,
        name: v.name,
        code: v.code,
        details: v.details,
      }));

      return [...limitedVariants, ...unlimitedVariants];
    });
  });

  // Deduplicate by variant ID
  const variantMap = new Map();
  allVariants.forEach(variant => {
    if (!variantMap.has(variant.id)) {
      variantMap.set(variant.id, variant);
    }
  });

  return Array.from(variantMap.values());
})();

// New: Link variants to their appearances in sets (with card number and rarity)
// This replaces SEED_SET_CARDS and allows variants to appear in multiple sets
export const SEED_VARIANT_SET_APPEARANCES = allSetsData.flatMap((setData) => {
  const isReflectionsSet = setData.set.id.includes('reflections');

  return setData.cards.flatMap((card) => {
    const limitedAppearance = {
      set_id: `${setData.set.id}-limited`,
      variant_id: `${card.id}_limited`,
      card_number: card.number,
      rarity: card.rarity,
    };

    // Reflections sets only have Limited versions
    if (isReflectionsSet) {
      return [limitedAppearance];
    }

    // All other sets have both Limited and Unlimited versions
    const unlimitedAppearance = {
      set_id: `${setData.set.id}-unlimited`,
      variant_id: `${card.id}_unlimited`,
      card_number: card.number,
      rarity: card.rarity,
    };

    return [limitedAppearance, unlimitedAppearance];
  });
});
