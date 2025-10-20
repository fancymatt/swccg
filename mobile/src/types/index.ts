export interface CardVariant {
  id: string;
  name: string;
  code: string;
  details?: string; // Optional descriptive details about this variant (e.g., "Card text cut off", "Complete card text")
  quantity: number;
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
