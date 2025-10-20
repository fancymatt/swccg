export interface CardVariant {
  id: string;
  name: string;
  code: string;
  details?: string; // Optional descriptive details about this variant (e.g., "Card text cut off", "Complete card text")
  quantity: number;
  setName?: string; // Set name where this variant appears (for search results)
  cardNumber?: string; // Card number in the set (for search results)
  setAbbr?: string; // Set abbreviation (for search results)
}

// New: Represents where a specific variant appears (can be in multiple sets)
export interface VariantSetAppearance {
  variant_id: string;
  set_id: string;
  card_number: string;
  rarity: string;
}

export interface Card {
  id: string;
  name: string;
  cardNumber: string;
  side: 'light' | 'dark';
  type: string;
  rarity?: string;
  setName: string;
  setIconPath?: string; // Set icon path for displaying set icons
  variants: CardVariant[];
  icon?: string; // Optional icon override for the card type icon
}
