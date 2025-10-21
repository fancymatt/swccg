/**
 * PriceCharting API integration for fetching Star Wars CCG card prices
 */

const PRICECHARTING_API_BASE = 'https://www.pricecharting.com/api';

// API token should be stored in environment or config
// Users need a paid subscription to get an API token from pricecharting.com
let API_TOKEN: string | null = null;

export function setPriceChartingToken(token: string) {
  API_TOKEN = token;
}

export function getPriceChartingToken(): string | null {
  return API_TOKEN;
}

interface PriceChartingProduct {
  id: number;
  'product-name': string;
  'console-name': string;
  'loose-price': number;  // Price in cents
  'graded-price': number; // Price in cents
  'cib-price'?: number;
  'new-price'?: number;
}

interface PriceChartingResponse {
  products?: PriceChartingProduct[];
  id?: number;
  'product-name'?: string;
  'console-name'?: string;
  'loose-price'?: number;
  'graded-price'?: number;
}

/**
 * Search for a card by name on PriceCharting
 * Returns the first matching product for Star Wars CCG
 */
export async function searchCardPrice(cardName: string): Promise<PriceChartingProduct | null> {
  if (!API_TOKEN) {
    console.warn('PriceCharting API token not configured');
    return null;
  }

  try {
    // Add "Star Wars CCG" to the search query to narrow results
    const searchQuery = encodeURIComponent(`${cardName} Star Wars CCG`);
    const url = `${PRICECHARTING_API_BASE}/products?t=${API_TOKEN}&q=${searchQuery}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`PriceCharting API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: PriceChartingResponse = await response.json();

    if (data.products && data.products.length > 0) {
      // Find the first product that matches Star Wars CCG
      const product = data.products.find(p =>
        p['console-name']?.toLowerCase().includes('star wars') ||
        p['product-name']?.toLowerCase().includes('star wars ccg')
      );

      return product || data.products[0];
    }

    return null;
  } catch (error) {
    console.error('Error fetching price data:', error);
    return null;
  }
}

/**
 * Search for multiple cards with rate limiting to avoid overwhelming the API
 */
export async function searchMultipleCardPrices(
  cardNames: string[],
  delayMs: number = 500,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, PriceChartingProduct>> {
  const results = new Map<string, PriceChartingProduct>();

  for (let i = 0; i < cardNames.length; i++) {
    const cardName = cardNames[i];

    if (onProgress) {
      onProgress(i + 1, cardNames.length);
    }

    const product = await searchCardPrice(cardName);

    if (product) {
      results.set(cardName, product);
    }

    // Rate limiting - wait between requests
    if (i < cardNames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Format price in cents to dollar string
 */
export function formatPrice(priceInCents: number | undefined | null): string {
  if (priceInCents === undefined || priceInCents === null || priceInCents === 0) {
    return 'N/A';
  }

  const dollars = priceInCents / 100;
  return `$${dollars.toFixed(2)}`;
}
