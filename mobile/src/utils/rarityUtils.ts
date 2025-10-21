/**
 * Rarity normalization utilities
 * Provides consistent rarity categorization across the app
 */

export type RarityCategory = 'common' | 'uncommon' | 'rare' | 'other';

/**
 * Normalize rarity codes to unified categories
 *
 * Maps various rarity codes (C1, C2, U1, R1, etc.) to standard categories
 *
 * @param rarity - The raw rarity string from database (e.g., "C1", "U2", "R1")
 * @returns Normalized rarity category
 *
 * @example
 * normalizeRarity("C1") // returns "common"
 * normalizeRarity("U2") // returns "uncommon"
 * normalizeRarity("R1") // returns "rare"
 * normalizeRarity("PM") // returns "other"
 */
export function normalizeRarity(rarity: string | null | undefined): RarityCategory {
  if (!rarity) return 'other';

  const rarityUpper = rarity.toUpperCase();

  // Common: C1, C2, C3, etc.
  if (rarityUpper.startsWith('C')) return 'common';

  // Uncommon: U1, U2, etc.
  if (rarityUpper.startsWith('U')) return 'uncommon';

  // Rare: R1, R2, etc.
  if (rarityUpper.startsWith('R')) return 'rare';

  // Everything else (foils, promos, etc.)
  return 'other';
}

/**
 * Get display name for rarity category
 *
 * @param rarity - The raw rarity string
 * @returns User-friendly display name
 *
 * @example
 * getRarityDisplayName("C1") // returns "Common"
 * getRarityDisplayName("U2") // returns "Uncommon"
 */
export function getRarityDisplayName(rarity: string | undefined): string {
  const normalized = normalizeRarity(rarity);

  switch (normalized) {
    case 'common':
      return 'Common';
    case 'uncommon':
      return 'Uncommon';
    case 'rare':
      return 'Rare';
    case 'other':
    default:
      return 'Other';
  }
}

/**
 * Get color for rarity category (used in UI)
 *
 * @param rarity - The raw rarity string
 * @returns Hex color code for the rarity
 *
 * @example
 * getRarityColor("C1") // returns "#10b981" (green)
 * getRarityColor("R1") // returns "#f59e0b" (amber)
 */
export function getRarityColor(rarity: string | undefined): string {
  const normalized = normalizeRarity(rarity);

  switch (normalized) {
    case 'common':
      return '#10b981'; // green
    case 'uncommon':
      return '#3b82f6'; // blue
    case 'rare':
      return '#f59e0b'; // amber
    case 'other':
    default:
      return '#8b5cf6'; // purple
  }
}
