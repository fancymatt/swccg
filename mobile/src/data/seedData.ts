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
export const SEED_SETS = allSetsData.flatMap((setData) => [
  {
    id: `${setData.set.id}-limited`,
    name: setData.set.name,
    abbreviation: setData.set.abbreviation,
    release_date: setData.set.releaseDate,
  },
  {
    id: `${setData.set.id}-unlimited`,
    name: `${setData.set.name} Unlimited`,
    abbreviation: `${setData.set.abbreviation}-U`,
    // Unlimited sets released approximately 6 months after Limited
    release_date: setData.set.releaseDate ?
      new Date(new Date(setData.set.releaseDate).getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : setData.set.releaseDate,
  },
]);

// Cards (unique definitions per set appearance)
export const SEED_CARDS = allSetsData.flatMap((setData) =>
  setData.cards.map((card) => ({
    id: card.id,
    name: card.name,
    side: card.side,
    type: card.type,
  }))
);

// Link cards to sets with card numbers and rarities
// Each card appears in both Limited and Unlimited versions of its set
export const SEED_SET_CARDS = allSetsData.flatMap((setData) =>
  setData.cards.flatMap((card) => [
    {
      set_id: `${setData.set.id}-limited`,
      card_id: card.id,
      card_number: card.number,
      rarity: card.rarity,
    },
    {
      set_id: `${setData.set.id}-unlimited`,
      card_id: card.id,
      card_number: card.number,
      rarity: card.rarity,
    },
  ])
);

// Card variants (editions: Limited and Unlimited)
// Variant IDs remain the same to preserve user collection data
export const SEED_VARIANTS = allSetsData.flatMap((setData) =>
  setData.cards.flatMap((card) => [
    {
      id: `${card.id}_limited`,
      card_id: card.id,
      name: 'Limited',
      code: 'LTD',
    },
    {
      id: `${card.id}_unlimited`,
      card_id: card.id,
      name: 'Unlimited',
      code: 'UNL',
    },
  ])
);
