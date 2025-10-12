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
}
