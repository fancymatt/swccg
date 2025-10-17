export interface CardVariant {
  id: string;
  name: string;
  code: string;
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
  variants: CardVariant[];
  icon?: string; // Optional SVG icon path/identifier for the type icon
  iconColor?: string; // Optional color override for the type icon (used if no icon is provided)
}
