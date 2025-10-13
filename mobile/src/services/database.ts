import * as SQLite from 'expo-sqlite';

// Database instances
let encyclopediaDb: SQLite.SQLiteDatabase | null = null;
let collectionDb: SQLite.SQLiteDatabase | null = null;

// Database version for tracking migrations
// Increment this to trigger a reseed of the encyclopedia database
const DB_VERSION = 3;

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
    abbreviation TEXT
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    side TEXT NOT NULL,
    type TEXT NOT NULL
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

    // Initialize collection database
    collectionDb = await SQLite.openDatabaseAsync('collection.db');
    await collectionDb.execAsync(COLLECTION_SCHEMA);

    console.log('Databases initialized successfully');
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
  sets: Array<{ id: string; name: string; abbreviation?: string; release_date?: string }>,
  cards: Array<{ id: string; name: string; side: string; type: string }>,
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
    }

    // Clear existing data
    await encyclopediaDb.execAsync('DELETE FROM variants; DELETE FROM set_cards; DELETE FROM cards; DELETE FROM sets;');

    // Insert sets
    for (const set of sets) {
      await encyclopediaDb.runAsync(
        'INSERT INTO sets (id, name, abbreviation, release_date) VALUES (?, ?, ?, ?)',
        [set.id, set.name, set.abbreviation || null, set.release_date || null]
      );
    }

    // Insert cards
    for (const card of cards) {
      await encyclopediaDb.runAsync(
        'INSERT INTO cards (id, name, side, type) VALUES (?, ?, ?, ?)',
        [card.id, card.name, card.side, card.type]
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
        release_date
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
 * Update the quantity for a specific variant in the user's collection
 */
export async function updateVariantQuantity(variantId: string, quantity: number): Promise<void> {
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
 * Get set completion statistics broken down by rarity
 * For Limited/Unlimited sets, only count the matching variant
 */
export async function getSetCompletionStats(setId: string): Promise<SetCompletionStats> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  try {
    // Get all cards in the set with their rarity
    const cards = await encyclopediaDb.getAllAsync<{ card_id: string; rarity: string | null }>(`
      SELECT sc.card_id, sc.rarity
      FROM set_cards sc
      WHERE sc.set_id = ?
    `, [setId]);

    // Determine which variant suffix to filter by based on set ID
    const variantSuffix = setId.endsWith('-limited') ? '_limited' :
                         setId.endsWith('-unlimited') ? '_unlimited' : null;

    // Initialize stats
    const stats: SetCompletionStats = {
      total: { owned: 0, total: cards.length },
      common: { owned: 0, total: 0 },
      uncommon: { owned: 0, total: 0 },
      rare: { owned: 0, total: 0 },
      other: { owned: 0, total: 0 },
    };

    // Process each card
    for (const card of cards) {
      const normalizedRarity = normalizeRarity(card.rarity);

      // Increment total count for this rarity
      if (normalizedRarity === 'Common') stats.common.total++;
      else if (normalizedRarity === 'Uncommon') stats.uncommon.total++;
      else if (normalizedRarity === 'Rare') stats.rare.total++;
      else stats.other.total++;

      // Check if the appropriate variant of this card is owned
      const variants = await encyclopediaDb.getAllAsync<{ variant_id: string }>(`
        SELECT v.id as variant_id
        FROM variants v
        WHERE v.card_id = ?
      `, [card.card_id]);

      // Filter variants based on set type
      const filteredVariants = variantSuffix
        ? variants.filter((v) => v.variant_id.endsWith(variantSuffix))
        : variants;

      let isOwned = false;
      for (const variant of filteredVariants) {
        const result = await collectionDb.getFirstAsync<{ quantity: number }>(
          'SELECT quantity FROM collection WHERE variant_id = ? AND quantity > 0',
          [variant.variant_id]
        );
        if (result && result.quantity > 0) {
          isOwned = true;
          break;
        }
      }

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
    console.log('Databases closed successfully');
  } catch (error) {
    console.error('Failed to close databases:', error);
    throw error;
  }
}
