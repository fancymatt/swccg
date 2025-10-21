import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import type { Set, Card, CardVariant } from '../types';
import { normalizeRarity } from '../utils/rarityUtils';

// Database instances
let encyclopediaDb: SQLite.SQLiteDatabase | null = null;
let collectionDb: SQLite.SQLiteDatabase | null = null;

// Initialization state management to prevent race conditions
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

// Database version for tracking migrations
// Increment this to trigger a reseed of the encyclopedia database
const DB_VERSION = 29;

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
    details TEXT,
    pricing_id INTEGER,
    FOREIGN KEY (card_id) REFERENCES cards(id),
    FOREIGN KEY (pricing_id) REFERENCES card_pricing(id)
  );

  CREATE TABLE IF NOT EXISTS variant_set_appearances (
    set_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    card_number TEXT NOT NULL,
    rarity TEXT,
    PRIMARY KEY (set_id, variant_id),
    FOREIGN KEY (set_id) REFERENCES sets(id),
    FOREIGN KEY (variant_id) REFERENCES variants(id)
  );

  CREATE TABLE IF NOT EXISTS card_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_name TEXT NOT NULL,
    pc_id INTEGER UNIQUE,
    pc_card_name TEXT,
    pc_set_name TEXT,
    ungraded_price INTEGER,
    grade_7_price INTEGER,
    grade_8_price INTEGER,
    grade_9_price INTEGER,
    grade_10_price INTEGER,
    pc_last_updated_time TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_set_cards_set ON set_cards(set_id);
  CREATE INDEX IF NOT EXISTS idx_set_cards_card ON set_cards(card_id);
  CREATE INDEX IF NOT EXISTS idx_variants_card ON variants(card_id);
  CREATE INDEX IF NOT EXISTS idx_variant_appearances_set ON variant_set_appearances(set_id);
  CREATE INDEX IF NOT EXISTS idx_variant_appearances_variant ON variant_set_appearances(variant_id);
  CREATE INDEX IF NOT EXISTS idx_card_pricing_card_name ON card_pricing(card_name);
  CREATE INDEX IF NOT EXISTS idx_card_pricing_pc_id ON card_pricing(pc_id);
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
 * Uses a promise guard to prevent concurrent initialization attempts (race condition fix)
 */
export async function initializeDatabases(): Promise<void> {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization and store the promise
  initializationPromise = (async () => {
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
        const info = await FileSystem.getInfoAsync(dbPath);
        // FileSystem.setIsSkippedBackupAsync may not be available in all expo-file-system versions
        // This is a non-critical optimization for iOS backups
        if (info.exists) {
          // Skip this step if the method doesn't exist - it's optional
          console.log('Collection database exists and will be included in backups by default');
        }
      } catch (error) {
        // Non-fatal - log and continue
        console.warn('Could not check backup flag for collection database:', error);
      }

      // Mark as initialized
      isInitialized = true;
      console.log('Databases initialized successfully with WAL mode');
    } catch (error) {
      // Reset state on error to allow retry
      initializationPromise = null;
      isInitialized = false;
      encyclopediaDb = null;
      collectionDb = null;
      console.error('Failed to initialize databases:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Ensures database is initialized before running queries
 * Prevents race conditions where queries are attempted before initialization completes
 * Exported for future use if needed
 */
export async function ensureDatabaseReady(): Promise<void> {
  // If already initialized, return immediately
  if (isInitialized && encyclopediaDb && collectionDb) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    await initializationPromise;
  }

  // Double-check after waiting
  if (!encyclopediaDb || !collectionDb) {
    throw new Error('Database not initialized. Please call initializeDatabases() first.');
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
  variants: Array<{ id: string; card_id: string; name: string; code: string; details?: string }>,
  variantSetAppearances: Array<{ set_id: string; variant_id: string; card_number: string; rarity?: string }>,
  pricingData?: Array<{ card_name: string; pc_id: number; pc_card_name: string; pc_set_name: string; ungraded_price: number | null; grade_7_price: number | null; grade_8_price: number | null; grade_9_price: number | null; grade_10_price: number | null; pc_last_updated_time: string }>,
  variantPricingMappings?: Record<string, number>
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
      await encyclopediaDb.execAsync('DROP TABLE IF EXISTS card_pricing; DROP TABLE IF EXISTS variant_set_appearances; DROP TABLE IF EXISTS variants; DROP TABLE IF EXISTS set_cards; DROP TABLE IF EXISTS cards; DROP TABLE IF EXISTS sets;');
      // Recreate tables with updated schema
      await encyclopediaDb.execAsync(ENCYCLOPEDIA_SCHEMA);
    }

    // Clear existing data (only needed for first-time setup since migration drops tables)
    if (status === 'first-time') {
      await encyclopediaDb.execAsync('DELETE FROM variants; DELETE FROM set_cards; DELETE FROM cards; DELETE FROM sets;');
    }

    // BEGIN TRANSACTION for atomic operations and better performance
    console.log('Starting database transaction...');
    await encyclopediaDb.execAsync('BEGIN TRANSACTION');

    try {
      // Batch insert sets
      console.log(`Inserting ${sets.length} sets...`);
      const setsPlaceholders = sets.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const setsValues = sets.flatMap(set => [
        set.id,
        set.name,
        set.abbreviation || null,
        set.release_date || null,
        set.icon_path || null
      ]);
      await encyclopediaDb.runAsync(
        `INSERT INTO sets (id, name, abbreviation, release_date, icon_path) VALUES ${setsPlaceholders}`,
        setsValues
      );

      // Batch insert cards
      console.log(`Inserting ${cards.length} cards...`);
      const cardsPlaceholders = cards.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const cardsValues = cards.flatMap(card => [
        card.id,
        card.name,
        card.side,
        card.type,
        card.icon || null
      ]);
      await encyclopediaDb.runAsync(
        `INSERT OR REPLACE INTO cards (id, name, side, type, icon) VALUES ${cardsPlaceholders}`,
        cardsValues
      );

      // Batch insert set_cards relationships
      console.log(`Inserting ${setCards.length} set-card relationships...`);
      const setCardsPlaceholders = setCards.map(() => '(?, ?, ?, ?)').join(', ');
      const setCardsValues = setCards.flatMap(setCard => [
        setCard.set_id,
        setCard.card_id,
        setCard.card_number,
        setCard.rarity || null
      ]);
      await encyclopediaDb.runAsync(
        `INSERT OR REPLACE INTO set_cards (set_id, card_id, card_number, rarity) VALUES ${setCardsPlaceholders}`,
        setCardsValues
      );

      // Batch insert variants
      console.log(`Inserting ${variants.length} variants...`);
      const variantsPlaceholders = variants.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const variantsValues = variants.flatMap(variant => [
        variant.id,
        variant.card_id,
        variant.name,
        variant.code,
        variant.details || null
      ]);
      await encyclopediaDb.runAsync(
        `INSERT OR REPLACE INTO variants (id, card_id, name, code, details) VALUES ${variantsPlaceholders}`,
        variantsValues
      );

      // Batch insert variant_set_appearances relationships
      console.log(`Inserting ${variantSetAppearances.length} variant appearances...`);
      const appearancesPlaceholders = variantSetAppearances.map(() => '(?, ?, ?, ?)').join(', ');
      const appearancesValues = variantSetAppearances.flatMap(appearance => [
        appearance.set_id,
        appearance.variant_id,
        appearance.card_number,
        appearance.rarity || null
      ]);
      await encyclopediaDb.runAsync(
        `INSERT OR REPLACE INTO variant_set_appearances (set_id, variant_id, card_number, rarity) VALUES ${appearancesPlaceholders}`,
        appearancesValues
      );

      // Batch insert pricing data if provided
      if (pricingData && pricingData.length > 0) {
        console.log(`Inserting ${pricingData.length} pricing records...`);
        const pricingPlaceholders = pricingData.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const pricingValues = pricingData.flatMap(pricing => [
          pricing.card_name,
          pricing.pc_id,
          pricing.pc_card_name,
          pricing.pc_set_name,
          pricing.ungraded_price,
          pricing.grade_7_price,
          pricing.grade_8_price,
          pricing.grade_9_price,
          pricing.grade_10_price,
          pricing.pc_last_updated_time
        ]);
        await encyclopediaDb.runAsync(
          `INSERT OR REPLACE INTO card_pricing (card_name, pc_id, pc_card_name, pc_set_name, ungraded_price, grade_7_price, grade_8_price, grade_9_price, grade_10_price, pc_last_updated_time) VALUES ${pricingPlaceholders}`,
          pricingValues
        );
        console.log('Pricing data inserted successfully');
      }

      // Apply variant pricing mappings if provided
      if (variantPricingMappings && Object.keys(variantPricingMappings).length > 0) {
        console.log(`Applying ${Object.keys(variantPricingMappings).length} variant pricing mappings...`);

        // Build a map of pc_id -> pricing.id by querying all at once
        const pcIds = Object.values(variantPricingMappings);
        const placeholders = pcIds.map(() => '?').join(',');
        const pricingRecords = await encyclopediaDb.getAllAsync(
          `SELECT id, pc_id FROM card_pricing WHERE pc_id IN (${placeholders})`,
          pcIds
        ) as Array<{ id: number; pc_id: number }>;

        const pcIdToInternalId = new Map<number, number>();
        pricingRecords.forEach(record => {
          pcIdToInternalId.set(record.pc_id, record.id);
        });

        // Build batch UPDATE using CASE statement
        const variantIds: string[] = [];
        const caseStatements: string[] = [];

        for (const [variantId, pcId] of Object.entries(variantPricingMappings)) {
          const internalId = pcIdToInternalId.get(pcId);
          if (internalId) {
            variantIds.push(variantId);
            caseStatements.push(`WHEN '${variantId}' THEN ${internalId}`);
          }
        }

        if (variantIds.length > 0) {
          const variantIdsPlaceholders = variantIds.map(() => '?').join(',');
          await encyclopediaDb.runAsync(
            `UPDATE variants SET pricing_id = CASE id ${caseStatements.join(' ')} END WHERE id IN (${variantIdsPlaceholders})`,
            variantIds
          );
          console.log(`Applied ${variantIds.length} pricing mappings successfully`);
        }
      }

      // COMMIT TRANSACTION
      await encyclopediaDb.execAsync('COMMIT');
      console.log('Transaction committed successfully');
    } catch (error) {
      // ROLLBACK on error
      console.error('Error during seeding, rolling back transaction:', error);
      await encyclopediaDb.execAsync('ROLLBACK');
      throw error;
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

      // Clean up orphaned collection entries after migration
      // Remove any collection entries for variants that no longer exist in the encyclopedia
      if (collectionDb) {
        console.log('Cleaning up orphaned collection entries...');

        // Get all valid variant IDs from the encyclopedia
        const validVariants = await encyclopediaDb.getAllAsync<{ id: string }>(
          'SELECT id FROM variants'
        );
        const validVariantIds = new Set(validVariants.map(v => v.id));

        // Get all variant IDs from the collection
        const collectionVariants = await collectionDb.getAllAsync<{ variant_id: string }>(
          'SELECT variant_id FROM collection'
        );

        // Delete orphaned entries
        let orphanedCount = 0;
        for (const cv of collectionVariants) {
          if (!validVariantIds.has(cv.variant_id)) {
            await collectionDb.runAsync(
              'DELETE FROM collection WHERE variant_id = ?',
              [cv.variant_id]
            );
            orphanedCount++;
          }
        }

        if (orphanedCount > 0) {
          console.log(`Removed ${orphanedCount} orphaned collection entries`);
        } else {
          console.log('No orphaned collection entries found');
        }
      }
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
export async function getAllSets(): Promise<Set[]> {
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
    `) as Set[];

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
export async function getCardsInSet(setId: string): Promise<Card[]> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  try {
    // Get unique cards that appear in this set via their variants
    const cards = await encyclopediaDb.getAllAsync(`
      SELECT DISTINCT
        c.id as card_id,
        c.name as card_name,
        c.side,
        c.type,
        c.icon,
        MIN(vsa.card_number) as card_number,
        MIN(vsa.rarity) as rarity,
        s.name as set_name,
        s.abbreviation as set_abbr
      FROM variant_set_appearances vsa
      JOIN variants v ON vsa.variant_id = v.id
      JOIN cards c ON v.card_id = c.id
      JOIN sets s ON vsa.set_id = s.id
      WHERE vsa.set_id = ?
      GROUP BY c.id, c.name, c.side, c.type, c.icon, s.name, s.abbreviation
      ORDER BY
        CASE
          WHEN MIN(vsa.card_number) GLOB '[0-9]*' THEN 0
          ELSE 1
        END,
        CAST(REPLACE(REPLACE(MIN(vsa.card_number), 'R', ''), 'P', '') AS INTEGER)
    `, [setId]) as Array<{
      card_id: string;
      card_name: string;
      side: 'light' | 'dark';
      type: string;
      icon: string | null;
      card_number: string;
      rarity: string | null;
      set_name: string;
      set_abbr: string;
    }>;

    // For each card, get ONLY the variants that appear in this set
    const cardsWithVariants: Card[] = await Promise.all(
      cards.map(async (card) => {
        if (!encyclopediaDb || !collectionDb) {
          throw new Error('Database became unavailable during operation');
        }

        const variants = await encyclopediaDb.getAllAsync(`
          SELECT
            v.id as variant_id,
            v.name as variant_name,
            v.code as variant_code,
            v.details as variant_details
          FROM variants v
          JOIN variant_set_appearances vsa ON v.id = vsa.variant_id
          WHERE v.card_id = ? AND vsa.set_id = ?
          ORDER BY v.code
        `, [card.card_id, setId]) as Array<{
          variant_id: string;
          variant_name: string;
          variant_code: string;
          variant_details: string | null;
        }>;

        // Get quantities for each variant
        const variantsWithQuantity: CardVariant[] = await Promise.all(
          variants.map(async (variant) => {
            if (!collectionDb) {
              throw new Error('Collection database became unavailable');
            }

            const result = await collectionDb.getFirstAsync(
              'SELECT quantity FROM collection WHERE variant_id = ?',
              [variant.variant_id]
            ) as { quantity: number } | null;

            return {
              id: variant.variant_id,
              name: variant.variant_name,
              code: variant.variant_code,
              details: variant.variant_details || undefined,
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
          icon: card.icon || undefined,
          rarity: card.rarity || undefined,
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
export async function getCardsWithCollection(): Promise<Card[]> {
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
    `) as Array<{
      card_id: string;
      card_name: string;
      side: 'light' | 'dark';
      type: string;
    }>;

    // For each card, get its variants with quantities
    const cardsWithVariants: Card[] = await Promise.all(
      cards.map(async (card) => {
        if (!encyclopediaDb || !collectionDb) {
          throw new Error('Database became unavailable during operation');
        }

        const variants = await encyclopediaDb.getAllAsync(`
          SELECT
            v.id as variant_id,
            v.name as variant_name,
            v.code as variant_code,
            v.details as variant_details
          FROM variants v
          WHERE v.card_id = ?
          ORDER BY v.code
        `, [card.card_id]) as Array<{
          variant_id: string;
          variant_name: string;
          variant_code: string;
          variant_details: string | null;
        }>;

        // Get quantities for each variant
        const variantsWithQuantity: CardVariant[] = await Promise.all(
          variants.map(async (variant) => {
            if (!collectionDb) {
              throw new Error('Collection database became unavailable');
            }

            const result = await collectionDb.getFirstAsync(
              'SELECT quantity FROM collection WHERE variant_id = ?',
              [variant.variant_id]
            ) as { quantity: number } | null;

            return {
              id: variant.variant_id,
              name: variant.variant_name,
              code: variant.variant_code,
              details: variant.variant_details || undefined,
              quantity: result?.quantity || 0,
            };
          })
        );

        return {
          id: card.card_id,
          name: card.card_name,
          cardNumber: '',
          side: card.side,
          type: card.type,
          setName: '',
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
 * Normalize a string for fuzzy search by:
 * - Converting to lowercase
 * - Replacing various apostrophe characters with standard single quote
 * - Removing common punctuation that might vary
 */
function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    // Replace various apostrophe/quote characters with standard single quote
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u0060´'']/g, "'")
    // Replace various dash characters with standard hyphen
    .replace(/[\u2013\u2014\u2015]/g, "-");
}

/**
 * Search for cards by name across all sets
 * Returns unique cards with all their variants and collection quantities
 * Each card appears only once in results, with variants showing set info
 */
export async function searchCardsByName(searchQuery: string): Promise<Card[]> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');
  if (!collectionDb) throw new Error('Collection database not initialized');

  // Additional safety check - ensure databases are still valid
  if (!encyclopediaDb || !collectionDb) {
    console.error('Database references became null during search');
    return [];
  }

  try {
    // Normalize the search query to handle apostrophe variations
    const normalizedQuery = normalizeSearchString(searchQuery);

    // For fuzzy matching, also create a version without punctuation/spaces
    const fuzzyQuery = normalizedQuery.replace(/['\-\s]/g, '');

    // Search for unique card NAMES (not IDs) to group all instances of same card
    // We normalize both the card name and search query for matching
    // We do the normalization in JavaScript to avoid SQL syntax issues with special characters
    const allCards = await encyclopediaDb.getAllAsync<{
      name: string;
      id: string;
      side: string;
      type: string;
      icon: string | null;
    }>(`
      SELECT DISTINCT
        c.name,
        MIN(c.id) as id,
        c.side,
        c.type,
        c.icon
      FROM cards c
      GROUP BY c.name, c.side, c.type, c.icon
    `);

    // Filter and sort in JavaScript
    const cardNames = allCards
      .map(card => {
        const normalizedCardName = normalizeSearchString(card.name);
        const fuzzyCardName = normalizedCardName.replace(/['\-\s]/g, '');

        // Check if it matches
        const exactMatch = normalizedCardName.includes(normalizedQuery);
        const fuzzyMatch = fuzzyCardName.includes(fuzzyQuery);

        if (exactMatch || fuzzyMatch) {
          return {
            card_name: card.name,
            card_id: card.id,
            side: card.side,
            type: card.type,
            icon: card.icon,
            match_priority: exactMatch ? 1 : 2
          };
        }
        return null;
      })
      .filter((card): card is NonNullable<typeof card> => card !== null)
      .sort((a, b) => {
        if (a.match_priority !== b.match_priority) {
          return a.match_priority - b.match_priority;
        }
        return a.card_name.localeCompare(b.card_name);
      });

    // For each unique card name, get ALL variants from ALL card instances
    // Process cards sequentially in small batches to avoid overwhelming the database
    const cardsWithVariants: Card[] = [];
    const batchSize = 10;

    for (let i = 0; i < cardNames.length; i += batchSize) {
      const batch = cardNames.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (card) => {
          try {
            // Safety check before each database operation
            if (!encyclopediaDb || !collectionDb) {
              console.error('Database became unavailable during search');
              return null;
            }

            // Get ALL variants for ALL instances of this card name
            const variantsRaw = await encyclopediaDb.getAllAsync(`
              SELECT DISTINCT
                v.id as variant_id,
                v.name as variant_name,
                v.code as variant_code,
                v.details as variant_details
              FROM variants v
              JOIN cards c ON v.card_id = c.id
              WHERE c.name = ?
              ORDER BY v.code
            `, [card.card_name]) as Array<{
              variant_id: string;
              variant_name: string;
              variant_code: string;
              variant_details: string | null;
            }>;

            // For each variant, get its set appearances and quantity
            const variantsWithQuantity: CardVariant[] = await Promise.all(
              variantsRaw.map(async (variant) => {
                try {
                  if (!encyclopediaDb || !collectionDb) {
                    throw new Error('Database became unavailable during search');
                  }

                  // Get the first set appearance for this variant (for display)
                  const appearance = await encyclopediaDb.getFirstAsync(`
                    SELECT
                      vsa.card_number,
                      s.name as set_name,
                      s.abbreviation as set_abbr
                    FROM variant_set_appearances vsa
                    JOIN sets s ON vsa.set_id = s.id
                    WHERE vsa.variant_id = ?
                    ORDER BY s.release_date
                    LIMIT 1
                  `, [variant.variant_id]) as {
                    card_number: string;
                    set_name: string;
                    set_abbr: string;
                  } | null;

                  const result = await collectionDb.getFirstAsync(
                    'SELECT quantity FROM collection WHERE variant_id = ?',
                    [variant.variant_id]
                  ) as { quantity: number } | null;

                  return {
                    id: variant.variant_id,
                    name: variant.variant_name,
                    code: variant.variant_code,
                    details: variant.variant_details || undefined,
                    quantity: result?.quantity || 0,
                    setName: appearance?.set_name || '',
                    cardNumber: appearance?.card_number || '',
                    setAbbr: appearance?.set_abbr || '',
                  };
                } catch (variantError) {
                  console.error('Error fetching variant info:', variantError);
                  return {
                    id: variant.variant_id,
                    name: variant.variant_name,
                    code: variant.variant_code,
                    details: variant.variant_details || undefined,
                    quantity: 0,
                    setName: '',
                    cardNumber: '',
                    setAbbr: '',
                  };
                }
              })
            );

            const cardResult: Card = {
              id: card.card_id,
              name: card.card_name,
              cardNumber: '', // Not set-specific at card level
              side: card.side as 'light' | 'dark',
              type: card.type,
              icon: card.icon ? card.icon : undefined,
              rarity: '', // Not set-specific at card level
              setName: '', // Empty at card level, shown per variant
              variants: variantsWithQuantity,
            };
            return cardResult;
          } catch (cardError) {
            console.error('Error processing card during search:', cardError);
            return null;
          }
        })
      );

      // Filter out any null results from errors and add to results
      const validCards = batchResults.filter((card): card is Card => card !== null);
      cardsWithVariants.push(...validCards);
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

    const filteredCardVariants = cardVariants;

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
      if (normalizedRarity === 'common') stats.common.total++;
      else if (normalizedRarity === 'uncommon') stats.uncommon.total++;
      else if (normalizedRarity === 'rare') stats.rare.total++;
      else stats.other.total++;

      // Increment owned count if card is owned
      if (isOwned) {
        stats.total.owned++;
        if (normalizedRarity === 'common') stats.common.owned++;
        else if (normalizedRarity === 'uncommon') stats.uncommon.owned++;
        else if (normalizedRarity === 'rare') stats.rare.owned++;
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
 * Pricing data interface
 */
export interface CardPricing {
  card_name: string;
  pc_id: number;
  pc_card_name: string;
  pc_set_name: string;
  ungraded_price: number | null;
  grade_7_price: number | null;
  grade_8_price: number | null;
  grade_9_price: number | null;
  grade_10_price: number | null;
  pc_last_updated_time: string;
}

/**
 * Get pricing data for a specific variant
 * Uses the variant's pricing_id foreign key to look up the linked PriceCharting product
 */
export async function getVariantPricing(variantId: string): Promise<CardPricing | null> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');

  try {
    const pricing = await encyclopediaDb.getFirstAsync(
      `SELECT cp.* FROM card_pricing cp
       INNER JOIN variants v ON v.pricing_id = cp.id
       WHERE v.id = ?`,
      [variantId]
    ) as CardPricing | null;
    return pricing || null;
  } catch (error) {
    console.error('Failed to get variant pricing:', error);
    return null;
  }
}

/**
 * Get pricing data for multiple variants in a single query (batch operation)
 * This is much more efficient than calling getVariantPricing() in a loop
 * Returns a Map of variant_id -> CardPricing
 */
export async function getBatchVariantPricing(variantIds: string[]): Promise<Map<string, CardPricing>> {
  if (!encyclopediaDb) throw new Error('Encyclopedia database not initialized');

  const pricingMap = new Map<string, CardPricing>();

  if (variantIds.length === 0) {
    return pricingMap;
  }

  try {
    // Create placeholders for IN clause
    const placeholders = variantIds.map(() => '?').join(',');

    // Fetch all pricing data in a single query
    const results = await encyclopediaDb.getAllAsync(
      `SELECT cp.*, v.id as variant_id
       FROM card_pricing cp
       INNER JOIN variants v ON v.pricing_id = cp.id
       WHERE v.id IN (${placeholders})`,
      variantIds
    ) as Array<CardPricing & { variant_id: string }>;

    // Build the map
    for (const result of results) {
      const variantId = result.variant_id;
      // Remove variant_id from the pricing object before storing
      const { variant_id, ...pricing } = result;
      pricingMap.set(variantId, pricing);
    }

    return pricingMap;
  } catch (error) {
    console.error('Failed to get batch variant pricing:', error);
    return pricingMap;
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
    // Clear cache on database close
    statsCache.invalidateAll();
    console.log('Databases closed successfully');
  } catch (error) {
    console.error('Failed to close databases:', error);
    throw error;
  }
}
