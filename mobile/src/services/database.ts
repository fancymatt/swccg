import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';

// Database instances
let encyclopediaDb: SQLite.SQLiteDatabase | null = null;
let collectionDb: SQLite.SQLiteDatabase | null = null;

// Database version for tracking migrations
// Increment this to trigger a reseed of the encyclopedia database
const DB_VERSION = 9;

// Encyclopedia database schema
const ENCYCLOPEDIA_SCHEMA = `
  CREATE TABLE IF NOT EXISTS _metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    release_date TEXT,
    abbreviation TEXT,
    icon_path TEXT
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    side TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS set_cards (
    set_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    card_number TEXT NOT NULL,
    rarity TEXT,
    PRIMARY KEY (set_id, card_id),
    FOREIGN KEY (set_id) REFERENCES sets(id),
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );

  CREATE TABLE IF NOT EXISTS variants (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );

  CREATE INDEX IF NOT EXISTS idx_set_cards_set ON set_cards(set_id);
  CREATE INDEX IF NOT EXISTS idx_set_cards_card ON set_cards(card_id);
  CREATE INDEX IF NOT EXISTS idx_variants_card ON variants(card_id);
`;

// Collection database schema
const COLLECTION_SCHEMA = `
  CREATE TABLE IF NOT EXISTS collection (
    variant_id TEXT PRIMARY KEY,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_quantity ON collection(quantity);
`;

/**
 * Initialize both databases
 */
export async function initializeDatabases(): Promise<void> {
  try {
    // Initialize encyclopedia database
    encyclopediaDb = await SQLite.openDatabaseAsync('encyclopedia.db');

    // Create tables with schema
    await encyclopediaDb.execAsync(ENCYCLOPEDIA_SCHEMA);

    // Enable WAL mode for better concurrency (one writer, many readers)
    await encyclopediaDb.execAsync('PRAGMA journal_mode=WAL');

    // Initialize collection database
    collectionDb = await SQLite.openDatabaseAsync('collection.db');
    await collectionDb.execAsync(COLLECTION_SCHEMA);

    // Enable WAL mode for collection database too
    await collectionDb.execAsync('PRAGMA journal_mode=WAL');

    // Ensure collection database is included in iOS iCloud backups
    // FileSystem.documentDirectory is backed up by default on iOS
    // This explicitly ensures the database files are not excluded from backup
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/collection.db`;
      await FileSystem.getInfoAsync(dbPath).then(async (info) => {
        if (info.exists && FileSystem.setIsSkippedBackupAsync) {
          // Ensure NOT skipped from backup (false = include in backup)
          await FileSystem.setIsSkippedBackupAsync(dbPath, false);
        }
      });
    } catch (error) {
      // Non-fatal - log and continue
      console.warn('Could not set backup flag for collection database:', error);
    }

    console.log('Databases initialized successfully with WAL mode');
  } catch (error) {
    console.error('Failed to initialize databases:', error);
    throw error;
  }
}

export type DatabaseStatus = 'first-time' | 'migration' | 'up-to-date';

/**
 * Check database status
 */
async function checkDatabaseStatus(): Promise<DatabaseStatus> {
  if (!encyclopediaDb) return 'first-time';

  try {
    const result = await encyclopediaDb.getFirstAsync<{ value: string }>(
      'SELECT value FROM _metadata WHERE key = ?',
      ['db_version']
    );

    if (!result) return 'first-time';

    const currentVersion = parseInt(result.value);
    if (currentVersion < DB_VERSION) return 'migration';

    return 'up-to-date';
  } catch {
    return 'first-time';
  }
}

/**
 * Seed the encyclopedia database with initial data (only if needed)
 * Returns the database status: 'first-time', 'migration', or 'up-to-date'
 */
export async function seedEncyclopedia(
  sets: Array<{ id: string; name: string; abbreviation?: string; release_date?: string; icon_path?: string }>,
  cards: Array<{ id: string; name: string; side: string; type: string; icon?: string }>,
  setCards: Array<{ set_id: string; card_id: string; card_number: string; rarity?: string }>,
  variants: Array<{ id: string; card_id: string; name: string; code: string }>
): Promise<DatabaseStatus> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');

  try {
    // Check database status
    const status = await checkDatabaseStatus();

    if (status === 'up-to-date') {
      console.log('Database is up to date (version ' + DB_VERSION + '), no migration needed');
      return status;
    }

    if (status === 'first-time') {
      console.log('Setting up card encyclopedia for the first time...');
    } else if (status === 'migration') {
      console.log('Migrating card encyclopedia to version ' + DB_VERSION + '...');
      // Drop existing tables to recreate with new schema
      await encyclopediaDb.execAsync('DROP TABLE IF EXISTS variants; DROP TABLE IF EXISTS set_cards; DROP TABLE IF EXISTS cards; DROP TABLE IF EXISTS sets;');
      // Recreate tables with updated schema
      await encyclopediaDb.execAsync(ENCYCLOPEDIA_SCHEMA);
    }

    // Clear existing data (only needed for first-time setup since migration drops tables)
    if (status === 'first-time') {
      await encyclopediaDb.execAsync('DELETE FROM variants; DELETE FROM set_cards; DELETE FROM cards; DELETE FROM sets;');
    }

    // Insert sets
    for (const set of sets) {
      await encyclopediaDb.runAsync(
        'INSERT INTO sets (id, name, abbreviation, release_date, icon_path) VALUES (?, ?, ?, ?, ?)',
        [set.id, set.name, set.abbreviation || null, set.release_date || null, set.icon_path || null]
      );
    }

    // Insert cards
    for (const card of cards) {
      await encyclopediaDb.runAsync(
        'INSERT INTO cards (id, name, side, type, icon) VALUES (?, ?, ?, ?, ?)',
        [card.id, card.name, card.side, card.type, card.icon || null]
      );
    }

    // Insert set_cards relationships
    for (const setCard of setCards) {
      await encyclopediaDb.runAsync(
        'INSERT INTO set_cards (set_id, card_id, card_number, rarity) VALUES (?, ?, ?, ?)',
        [setCard.set_id, setCard.card_id, setCard.card_number, setCard.rarity || null]
      );
    }

    // Insert variants
    for (const variant of variants) {
      await encyclopediaDb.runAsync(
        'INSERT INTO variants (id, card_id, name, code) VALUES (?, ?, ?, ?)',
        [variant.id, variant.card_id, variant.name, variant.code]
      );
    }

    // Mark database as seeded
    await encyclopediaDb.runAsync(
      'INSERT OR REPLACE INTO _metadata (key, value) VALUES (?, ?)',
      ['db_version', DB_VERSION.toString()]
    );

    if (status === 'first-time') {
      console.log('Encyclopedia setup complete!');
    } else if (status === 'migration') {
      console.log('Encyclopedia migration complete!');
    }

    // Clear stats cache after reseeding/migration
    statsCache.invalidateAll();

    return status;
  } catch (error) {
    console.error('Failed to seed encyclopedia:', error);
    throw error;
  }
}

/**
 * Get all sets
 */
export async function getAllSets(): Promise<any[]> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');

  try {
    const sets = await encyclopediaDb.getAllAsync(`
      SELECT
        id,
        name,
        abbreviation,
        release_date,
        icon_path
      FROM sets
      ORDER BY release_date, name
    `);

    return sets;
  } catch (error) {
    console.error('Failed to get sets:', error);
    throw error;
  }
}

/**
 * Get all cards in a specific set with their variants and collection quantities
 * For Limited/Unlimited sets, only show the matching variant
 */
export async function getCardsInSet(setId: string): Promise<any[]> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  try {
    const cards = await encyclopediaDb.getAllAsync(`
      SELECT
        c.id as card_id,
        c.name as card_name,
        c.side,
        c.type,
        c.icon,
        sc.card_number,
        sc.rarity,
        s.name as set_name,
        s.abbreviation as set_abbr
      FROM cards c
      JOIN set_cards sc ON c.id = sc.card_id
      JOIN sets s ON sc.set_id = s.id
      WHERE sc.set_id = ?
      ORDER BY CAST(sc.card_number AS INTEGER)
    `, [setId]);

    // Determine which variant suffix to filter by based on set ID
    const variantSuffix = setId.endsWith('-limited') ? '_limited' :
                         setId.endsWith('-unlimited') ? '_unlimited' : null;

    // For each card, get its variants with quantities
    const cardsWithVariants = await Promise.all(
      cards.map(async (card: any) => {
        const variants = await encyclopediaDb!.getAllAsync(`
          SELECT
            v.id as variant_id,
            v.name as variant_name,
            v.code as variant_code
          FROM variants v
          WHERE v.card_id = ?
          ORDER BY v.code
        `, [card.card_id]);

        // Filter variants based on set type
        const filteredVariants = variantSuffix
          ? variants.filter((v: any) => v.variant_id.endsWith(variantSuffix))
          : variants;

        // Get quantities for each variant
        const variantsWithQuantity = await Promise.all(
          filteredVariants.map(async (variant: any) => {
            const result = await collectionDb!.getFirstAsync<{ quantity: number }>(
              'SELECT quantity FROM collection WHERE variant_id = ?',
              [variant.variant_id]
            );

            return {
              id: variant.variant_id,
              name: variant.variant_name,
              code: variant.variant_code,
              quantity: result?.quantity || 0,
            };
          })
        );

        return {
          id: card.card_id,
          name: card.card_name,
          cardNumber: card.card_number,
          side: card.side,
          type: card.type,
          icon: card.icon,
          rarity: card.rarity,
          setName: card.set_name,
          variants: variantsWithQuantity,
        };
      })
    );

    return cardsWithVariants;
  } catch (error) {
    console.error('Failed to get cards in set:', error);
    throw error;
  }
}

/**
 * Get all cards with their variants and collection quantities (legacy, kept for backwards compatibility)
 */
export async function getCardsWithCollection(): Promise<any[]> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  try {
    const cards = await encyclopediaDb.getAllAsync(`
      SELECT DISTINCT
        c.id as card_id,
        c.name as card_name,
        c.side,
        c.type
      FROM cards c
      JOIN set_cards sc ON c.id = sc.card_id
      ORDER BY c.name
    `);

    // For each card, get its variants with quantities
    const cardsWithVariants = await Promise.all(
      cards.map(async (card: any) => {
        const variants = await encyclopediaDb!.getAllAsync(`
          SELECT
            v.id as variant_id,
            v.name as variant_name,
            v.code as variant_code
          FROM variants v
          WHERE v.card_id = ?
          ORDER BY v.code
        `, [card.card_id]);

        // Get quantities for each variant
        const variantsWithQuantity = await Promise.all(
          variants.map(async (variant: any) => {
            const result = await collectionDb!.getFirstAsync<{ quantity: number }>(
              'SELECT quantity FROM collection WHERE variant_id = ?',
              [variant.variant_id]
            );

            return {
              id: variant.variant_id,
              name: variant.variant_name,
              code: variant.variant_code,
              quantity: result?.quantity || 0,
            };
          })
        );

        return {
          id: card.card_id,
          name: card.card_name,
          side: card.side,
          type: card.type,
          variants: variantsWithQuantity,
        };
      })
    );

    return cardsWithVariants;
  } catch (error) {
    console.error('Failed to get cards with collection:', error);
    throw error;
  }
}

/**
 * Search for cards by name across all sets
 * Returns cards grouped by their set appearances with variants and collection quantities
 */
export async function searchCardsByName(searchQuery: string): Promise<any[]> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  // Additional safety check - ensure databases are still valid
  if (!encyclopediaDb || !collectionDb) {
    console.error('Database references became null during search');
    return [];
  }

  try {
    // Search for cards matching the query (case-insensitive)
    const cards = await encyclopediaDb.getAllAsync(`
      SELECT
        c.id as card_id,
        c.name as card_name,
        c.side,
        c.type,
        c.icon,
        sc.card_number,
        sc.rarity,
        sc.set_id,
        s.name as set_name,
        s.abbreviation as set_abbr,
        s.icon_path as set_icon_path
      FROM cards c
      JOIN set_cards sc ON c.id = sc.card_id
      JOIN sets s ON sc.set_id = s.id
      WHERE LOWER(c.name) LIKE LOWER(?)
      ORDER BY c.name, s.release_date, CAST(sc.card_number AS INTEGER)
    `, [`%${searchQuery}%`]);

    // For each card appearance, get its variants with quantities
    // Process cards sequentially in small batches to avoid overwhelming the database
    const cardsWithVariants = [];
    const batchSize = 10;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (card: any) => {
          try {
            // Safety check before each database operation
            if (!encyclopediaDb || !collectionDb) {
              console.error('Database became unavailable during search');
              return null;
            }

            // Determine which variant suffix to filter by based on set ID
            const variantSuffix = card.set_id.endsWith('-limited') ? '_limited' :
                                 card.set_id.endsWith('-unlimited') ? '_unlimited' : null;

            const variants = await encyclopediaDb.getAllAsync(`
              SELECT
                v.id as variant_id,
                v.name as variant_name,
                v.code as variant_code
              FROM variants v
              WHERE v.card_id = ?
              ORDER BY v.code
            `, [card.card_id]);

            // Filter variants based on set type
            const filteredVariants = variantSuffix
              ? variants.filter((v: any) => v.variant_id.endsWith(variantSuffix))
              : variants;

            // Get quantities for each variant
            const variantsWithQuantity = await Promise.all(
              filteredVariants.map(async (variant: any) => {
                try {
                  const result = await collectionDb!.getFirstAsync<{ quantity: number }>(
                    'SELECT quantity FROM collection WHERE variant_id = ?',
                    [variant.variant_id]
                  );

                  return {
                    id: variant.variant_id,
                    name: variant.variant_name,
                    code: variant.variant_code,
                    quantity: result?.quantity || 0,
                  };
                } catch (variantError) {
                  console.error('Error fetching variant quantity:', variantError);
                  return {
                    id: variant.variant_id,
                    name: variant.variant_name,
                    code: variant.variant_code,
                    quantity: 0,
                  };
                }
              })
            );

            return {
              id: card.card_id,
              name: card.card_name,
              cardNumber: card.card_number,
              side: card.side,
              type: card.type,
              icon: card.icon,
              rarity: card.rarity,
              setId: card.set_id,
              setName: card.set_name,
              setAbbr: card.set_abbr,
              setIconPath: card.set_icon_path,
              variants: variantsWithQuantity,
            };
          } catch (cardError) {
            console.error('Error processing card during search:', cardError);
            return null;
          }
        })
      );

      // Filter out any null results from errors and add to results
      cardsWithVariants.push(...batchResults.filter(card => card !== null));
    }

    return cardsWithVariants;
  } catch (error) {
    console.error('Failed to search cards:', error);
    // Return empty array instead of throwing to prevent crashes
    return [];
  }
}

/**
 * Update the quantity for a specific variant in the user's collection
 */
export async function updateVariantQuantity(variantId: string, quantity: number): Promise<void> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  try {
    if (quantity === 0) {
      // Remove from collection if quantity is 0
      await collectionDb.runAsync('DELETE FROM collection WHERE variant_id = ?', [variantId]);
    } else {
      // Insert or update
      await collectionDb.runAsync(
        `INSERT INTO collection (variant_id, quantity, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(variant_id) DO UPDATE SET
           quantity = excluded.quantity,
           updated_at = CURRENT_TIMESTAMP`,
        [variantId, quantity]
      );
    }

    // Invalidate cache for all sets that contain this card
    // Get the card_id from the variant
    const variant = await encyclopediaDb.getFirstAsync<{ card_id: string }>(
      'SELECT card_id FROM variants WHERE id = ?',
      [variantId]
    );

    if (variant) {
      // Get all sets that contain this card
      const sets = await encyclopediaDb.getAllAsync<{ set_id: string }>(
        'SELECT set_id FROM set_cards WHERE card_id = ?',
        [variant.card_id]
      );

      // Invalidate cache for each set
      for (const set of sets) {
        statsCache.invalidate(set.set_id);
      }
    }
  } catch (error) {
    console.error('Failed to update variant quantity:', error);
    throw error;
  }
}

/**
 * Get the total number of cards owned
 */
export async function getTotalCardsOwned(): Promise<number> {
  if (!collectionDb) throw new Error('Collection database not initialized');

  try {
    const result = await collectionDb.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(quantity), 0) as total FROM collection'
    );
    return result?.total || 0;
  } catch (error) {
    console.error('Failed to get total cards owned:', error);
    throw error;
  }
}

/**
 * Helper function to normalize rarity codes to unified categories
 */
function normalizeRarity(rarity: string | null | undefined): string {
  if (!rarity) return 'Other';

  const rarityUpper = rarity.toUpperCase();

  // Common: C1, C2, C3, etc.
  if (rarityUpper.startsWith('C')) return 'Common';

  // Uncommon: U1, U2, etc.
  if (rarityUpper.startsWith('U')) return 'Uncommon';

  // Rare: R1, R2, etc.
  if (rarityUpper.startsWith('R')) return 'Rare';

  // Everything else (foils, promos, etc.)
  return 'Other';
}

export interface SetCompletionStats {
  total: { owned: number; total: number };
  common: { owned: number; total: number };
  uncommon: { owned: number; total: number };
  rare: { owned: number; total: number };
  other: { owned: number; total: number };
}

/**
 * Cache for set completion stats to reduce redundant database queries
 */
class StatsCache {
  private cache = new Map<string, { data: SetCompletionStats; timestamp: number }>();
  private TTL = 30000; // 30 seconds TTL (balance between freshness and performance)

  get(setId: string): SetCompletionStats | null {
    const cached = this.cache.get(setId);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data;
    }
    // Remove stale entry
    if (cached) {
      this.cache.delete(setId);
    }
    return null;
  }

  set(setId: string, data: SetCompletionStats): void {
    this.cache.set(setId, { data, timestamp: Date.now() });
  }

  invalidate(setId: string): void {
    this.cache.delete(setId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

// Global cache instance
const statsCache = new StatsCache();

// Mutex to prevent concurrent getSetCompletionStats calls
const statsLocks = new Map<string, Promise<SetCompletionStats>>();

/**
 * Get set completion statistics broken down by rarity
 * For Limited/Unlimited sets, only count the matching variant
 *
 * This function uses a cache to avoid redundant database queries.
 * The cache is invalidated when collection quantities are updated.
 */
export async function getSetCompletionStats(setId: string): Promise<SetCompletionStats> {
  // Check cache first
  const cached = statsCache.get(setId);
  if (cached) {
    return cached;
  }

  // If there's already a stats calculation in progress for this set, wait for it
  const existingPromise = statsLocks.get(setId);
  if (existingPromise) {
    return existingPromise;
  }

  // Create a new promise for this calculation
  const statsPromise = calculateSetCompletionStats(setId);
  statsLocks.set(setId, statsPromise);

  try {
    const result = await statsPromise;
    // Store in cache
    statsCache.set(setId, result);
    return result;
  } finally {
    // Clean up the lock
    statsLocks.delete(setId);
  }
}

/**
 * Internal function that actually calculates the stats
 * Optimized to use 2 bulk queries instead of 300+ sequential queries
 */
async function calculateSetCompletionStats(setId: string): Promise<SetCompletionStats> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  try {
    // Determine which variant suffix to filter by based on set ID
    const variantSuffix = setId.endsWith('-limited') ? '_limited' :
                         setId.endsWith('-unlimited') ? '_unlimited' : null;

    // Query 1: Get all cards in the set with their variants (in bulk)
    const cardVariants = await encyclopediaDb.getAllAsync<{
      card_id: string;
      rarity: string | null;
      variant_id: string;
    }>(`
      SELECT
        sc.card_id,
        sc.rarity,
        v.id as variant_id
      FROM set_cards sc
      JOIN variants v ON v.card_id = sc.card_id
      WHERE sc.set_id = ?
    `, [setId]);

    // Filter variants based on set type
    const filteredCardVariants = variantSuffix
      ? cardVariants.filter(cv => cv.variant_id.endsWith(variantSuffix))
      : cardVariants;

    // Extract unique variant IDs for collection lookup
    const variantIds = [...new Set(filteredCardVariants.map(cv => cv.variant_id))];

    // Query 2: Get all owned variants in one query (in bulk)
    const ownedVariants = new Set<string>();
    if (variantIds.length > 0) {
      // Create placeholders for IN clause
      const placeholders = variantIds.map(() => '?').join(',');
      const owned = await collectionDb.getAllAsync<{ variant_id: string }>(
        `SELECT variant_id FROM collection WHERE variant_id IN (${placeholders}) AND quantity > 0`,
        variantIds
      );
      owned.forEach(row => ownedVariants.add(row.variant_id));
    }

    // Build a map of card_id -> is_owned
    const cardOwnership = new Map<string, boolean>();
    for (const cv of filteredCardVariants) {
      if (ownedVariants.has(cv.variant_id)) {
        cardOwnership.set(cv.card_id, true);
      }
      if (!cardOwnership.has(cv.card_id)) {
        cardOwnership.set(cv.card_id, false);
      }
    }

    // Get unique cards with their rarities
    const uniqueCards = new Map<string, string | null>();
    for (const cv of filteredCardVariants) {
      if (!uniqueCards.has(cv.card_id)) {
        uniqueCards.set(cv.card_id, cv.rarity);
      }
    }

    // Initialize stats
    const stats: SetCompletionStats = {
      total: { owned: 0, total: uniqueCards.size },
      common: { owned: 0, total: 0 },
      uncommon: { owned: 0, total: 0 },
      rare: { owned: 0, total: 0 },
      other: { owned: 0, total: 0 },
    };

    // Process cards (just counting, no queries!)
    for (const [cardId, rarity] of uniqueCards) {
      const normalizedRarity = normalizeRarity(rarity);
      const isOwned = cardOwnership.get(cardId) || false;

      // Increment total count for this rarity
      if (normalizedRarity === 'Common') stats.common.total++;
      else if (normalizedRarity === 'Uncommon') stats.uncommon.total++;
      else if (normalizedRarity === 'Rare') stats.rare.total++;
      else stats.other.total++;

      // Increment owned count if card is owned
      if (isOwned) {
        stats.total.owned++;
        if (normalizedRarity === 'Common') stats.common.owned++;
        else if (normalizedRarity === 'Uncommon') stats.uncommon.owned++;
        else if (normalizedRarity === 'Rare') stats.rare.owned++;
        else stats.other.owned++;
      }
    }

    return stats;
  } catch (error) {
    console.error('Failed to get set completion stats:', error);
    throw error;
  }
}

/**
 * Manually invalidate the stats cache for a specific set
 * Useful for forcing a refresh of stats
 */
export function invalidateStatsCache(setId: string): void {
  statsCache.invalidate(setId);
}

/**
 * Clear all cached stats
 * Useful when doing bulk operations or reseeding the database
 */
export function clearStatsCache(): void {
  statsCache.invalidateAll();
}

/**
 * Close both databases
 */
export async function closeDatabases(): Promise<void> {
  try {
    if (encyclopediaDb) {
      await encyclopediaDb.closeAsync();
      encyclopediaDb = null;
    }
    if (collectionDb) {
      await collectionDb.closeAsync();
      collectionDb = null;
    }
    // Clear cache on database close
    statsCache.invalidateAll();
    console.log('Databases closed successfully');
  } catch (error) {
    console.error('Failed to close databases:', error);
    throw error;
  }
}
