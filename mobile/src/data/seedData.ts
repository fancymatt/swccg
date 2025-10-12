// Seed data for Star Wars CCG sets
// Based on the official Star Wars CCG card list
// ID format: {set-abbreviation}_{card-number}_{card-name-slug}

import premiereCardsData from './premiere-cards.json';
import aNewHopeCardsData from './a-new-hope-cards.json';
import hothCardsData from './hoth-cards.json';
import dagobahCardsData from './dagobah-cards.json';
import jabbasPalaceCardsData from './jabbas-palace-cards.json';
import cloudCityCardsData from './cloud-city-cards.json';

// Combine all set data
const allSetsData = [
  premiereCardsData,
  aNewHopeCardsData,
  hothCardsData,
  cloudCityCardsData,
  dagobahCardsData,
  jabbasPalaceCardsData,
];

// Export sets
export const SEED_SETS = allSetsData.map((setData) => ({
  id: setData.set.id,
  name: setData.set.name,
  abbreviation: setData.set.abbreviation,
  release_date: setData.set.releaseDate,
}));

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
export const SEED_SET_CARDS = allSetsData.flatMap((setData) =>
  setData.cards.map((card) => ({
    set_id: setData.set.id,
    card_id: card.id,
    card_number: card.number,
    rarity: card.rarity,
  }))
);

// Card variants (editions: Limited and Unlimited)
export const SEED_VARIANTS = allSetsData.flatMap((setData) =>
  setData.cards.flatMap((card) => [
    {
      id: `${card.id}_limited`,
      card_id: card.id,
      name: 'Limited (Dark Border)',
      code: 'LTD',
    },
    {
      id: `${card.id}_unlimited`,
      card_id: card.id,
      name: 'Unlimited (White Border)',
      code: 'UNL',
    },
  ])
);
