import * as SQLite from 'expo-sqlite';

// Database instances
let encyclopediaDb: SQLite.SQLiteDatabase | null = null;
let collectionDb: SQLite.SQLiteDatabase | null = null;

// Encyclopedia database schema
const ENCYCLOPEDIA_SCHEMA = `
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

    // Drop existing tables to ensure clean schema migration
    await encyclopediaDb.execAsync(`
      DROP TABLE IF EXISTS variants;
      DROP TABLE IF EXISTS set_cards;
      DROP TABLE IF EXISTS cards;
      DROP TABLE IF EXISTS sets;
    `);

    // Create tables with new schema
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

/**
 * Seed the encyclopedia database with initial data
 */
export async function seedEncyclopedia(
  sets: Array<{ id: string; name: string; abbreviation?: string; release_date?: string }>,
  cards: Array<{ id: string; name: string; side: string; type: string }>,
  setCards: Array<{ set_id: string; card_id: string; card_number: string; rarity?: string }>,
  variants: Array<{ id: string; card_id: string; name: string; code: string }>
): Promise<void> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');

  try {
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

    console.log('Encyclopedia seeded successfully');
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
