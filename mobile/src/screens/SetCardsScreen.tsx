import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useCollectionStats } from '../contexts/CollectionStatsContext';
import { CardListItem } from '../components/CardListItem';
import { ProgressBar } from '../components/ProgressBar';
import { FilterBar, FilterCategory } from '../components/FilterBar';
import { getCardsInSet, updateVariantQuantity, getSetCompletionStats, getBatchVariantPricing, SetCompletionStats, CardPricing } from '../services/database';
import type { Card } from '../types';

interface SetCardsScreenProps {
  route: any;
  navigation: any;
}

export const SetCardsScreen: React.FC<SetCardsScreenProps> = ({ route, navigation }) => {
  const { setId, setName } = route.params;
  const { colors } = useTheme();
  const { updateSetStats } = useCollectionStats();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SetCompletionStats | null>(null);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [pricingMap, setPricingMap] = useState<Map<string, CardPricing>>(new Map());
  const [loadingPricing, setLoadingPricing] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({
    side: [],
    type: [],
    rarity: [],
    owned: [],
  });

  const calculateTotalValue = useCallback(async (cardsData: Card[]) => {
    setLoadingPricing(true);
    try {
      // Collect all variant IDs from all cards
      const variantIds: string[] = [];
      for (const card of cardsData) {
        for (const variant of card.variants) {
          variantIds.push(variant.id);
        }
      }

      // Fetch all pricing data in a single batch query
      const pricing = await getBatchVariantPricing(variantIds);
      setPricingMap(pricing);

      // Calculate total value using the pricing map
      let total = 0;
      for (const card of cardsData) {
        for (const variant of card.variants) {
          const variantPricing = pricing.get(variant.id);
          if (variantPricing && variantPricing.ungraded_price) {
            total += (variantPricing.ungraded_price / 100) * variant.quantity;
          }
        }
      }
      setTotalValue(total);
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  const loadCards = useCallback(async () => {
    try {
      const cardsData = await getCardsInSet(setId);
      setCards(cardsData as Card[]);

      // Load completion stats
      const completionStats = await getSetCompletionStats(setId);
      setStats(completionStats);

      // Calculate total value
      await calculateTotalValue(cardsData as Card[]);

      // Update shared collection stats
      updateSetStats(setId, completionStats);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  }, [setId, updateSetStats, calculateTotalValue]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Helper function to normalize rarity codes to unified categories
  const normalizeRarity = useCallback((rarity: string | undefined): 'common' | 'uncommon' | 'rare' | 'other' => {
    if (!rarity) return 'other';
    const rarityUpper = rarity.toUpperCase();
    if (rarityUpper.startsWith('C')) return 'common';
    if (rarityUpper.startsWith('U')) return 'uncommon';
    if (rarityUpper.startsWith('R')) return 'rare';
    return 'other';
  }, []);

  const handleVariantQuantityChange = useCallback(async (
    cardId: string,
    variantId: string,
    newQuantity: number
  ) => {
    // Store the old quantity and card details for rollback if needed
    let oldQuantity = 0;
    let cardRarity: string | undefined = undefined;

    setCards((prevCards) => {
      const card = prevCards.find((card) => card.id === cardId);
      const variant = card?.variants.find((variant) => variant.id === variantId);
      oldQuantity = variant?.quantity ?? 0;
      cardRarity = card?.rarity;
      return prevCards;
    });

    try {
      // Optimistically update local state FIRST (instant UI response)
      setCards((prevCards) =>
        prevCards.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              variants: card.variants.map((variant) =>
                variant.id === variantId
                  ? { ...variant, quantity: newQuantity }
                  : variant
              ),
            };
          }
          return card;
        })
      );

      // Then update database in the background
      await updateVariantQuantity(variantId, newQuantity);

      // Update stats incrementally instead of full recalc
      const wasOwned = oldQuantity > 0;
      const isOwned = newQuantity > 0;

      if (wasOwned !== isOwned && stats) {
        // Ownership changed - update stats incrementally
        const rarityKey = normalizeRarity(cardRarity);
        const delta = isOwned ? 1 : -1; // +1 if we gained ownership, -1 if we lost it

        const updatedStats: SetCompletionStats = {
          ...stats,
          total: {
            ...stats.total,
            owned: stats.total.owned + delta,
          },
          [rarityKey]: {
            ...stats[rarityKey],
            owned: stats[rarityKey].owned + delta,
          },
        };

        setStats(updatedStats);

        // Update shared collection stats
        updateSetStats(setId, updatedStats);
      }

      // Recalculate total value with updated cards
      setCards((currentCards) => {
        calculateTotalValue(currentCards);
        return currentCards;
      });
    } catch (error) {
      console.error('Failed to update variant quantity:', error);

      // Rollback the optimistic update on error
      setCards((prevCards) =>
        prevCards.map((card) => {
          if (card.id === cardId) {
            return {
              ...card,
              variants: card.variants.map((variant) =>
                variant.id === variantId
                  ? { ...variant, quantity: oldQuantity }
                  : variant
              ),
            };
          }
          return card;
        })
      );
    }
  }, [setId, updateSetStats, calculateTotalValue, stats, normalizeRarity]);

  // Define filter categories
  const filterCategories: FilterCategory[] = useMemo(() => {
    // Get unique values from cards
    const sides = Array.from(new Set(cards.map((c) => c.side))).sort();
    const types = Array.from(new Set(cards.map((c) => c.type))).sort();
    const rarities = Array.from(new Set(cards.map((c) => c.rarity || 'Unknown'))).sort();

    return [
      {
        key: 'side',
        label: 'Side',
        options: sides.map((s) => ({ value: s, label: s === 'dark' ? 'Dark Side' : 'Light Side' })),
      },
      {
        key: 'type',
        label: 'Type',
        options: types.map((t) => ({ value: t, label: t })),
      },
      {
        key: 'rarity',
        label: 'Rarity',
        options: rarities.map((r) => ({ value: r, label: r })),
      },
      {
        key: 'owned',
        label: 'Collection',
        options: [
          { value: 'owned', label: 'Owned' },
          { value: 'unowned', label: 'Not Owned' },
        ],
      },
    ];
  }, [cards]);

  // Filter cards based on active filters
  const filteredCards = useMemo(() => {
    let filtered = [...cards];

    // Apply side filter
    if (activeFilters.side.length > 0) {
      filtered = filtered.filter((card) => activeFilters.side.includes(card.side));
    }

    // Apply type filter
    if (activeFilters.type.length > 0) {
      filtered = filtered.filter((card) => activeFilters.type.includes(card.type));
    }

    // Apply rarity filter
    if (activeFilters.rarity.length > 0) {
      filtered = filtered.filter((card) =>
        activeFilters.rarity.includes(card.rarity || 'Unknown')
      );
    }

    // Apply owned filter
    if (activeFilters.owned.length > 0) {
      filtered = filtered.filter((card) => {
        const isOwned = card.variants.some((v) => v.quantity > 0);
        return activeFilters.owned.some((filter) =>
          filter === 'owned' ? isOwned : !isOwned
        );
      });
    }

    return filtered;
  }, [cards, activeFilters]);

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.widgetBg,
    },
    container: {
      flex: 1,
    },
    listContent: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    summarySection: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
    },
    totalValueContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalValueText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.success,
      textAlign: 'center',
    },
  }), [colors]);

  const renderCard = useCallback(({ item }: { item: Card }) => (
    <CardListItem
      card={item}
      pricingMap={pricingMap}
      onVariantQuantityChange={handleVariantQuantityChange}
      loadingPricing={loadingPricing}
    />
  ), [handleVariantQuantityChange, pricingMap, loadingPricing]);

  const renderListHeader = useCallback(() => {
    return (
      <>
        {stats && (
          <View style={styles.summarySection}>
            <Text style={[styles.summaryTitle, { color: colors.fg }]}>
              Collection Progress
            </Text>
            <ProgressBar
              label="Total"
              owned={stats.total.owned}
              total={stats.total.total}
              color={colors.accent}
            />
            {stats.common.total > 0 && (
              <ProgressBar
                label="Common"
                owned={stats.common.owned}
                total={stats.common.total}
                color="#10b981"
              />
            )}
            {stats.uncommon.total > 0 && (
              <ProgressBar
                label="Uncommon"
                owned={stats.uncommon.owned}
                total={stats.uncommon.total}
                color="#3b82f6"
              />
            )}
            {stats.rare.total > 0 && (
              <ProgressBar
                label="Rare"
                owned={stats.rare.owned}
                total={stats.rare.total}
                color="#f59e0b"
              />
            )}
            {stats.other.total > 0 && (
              <ProgressBar
                label="Other"
                owned={stats.other.owned}
                total={stats.other.total}
                color="#8b5cf6"
              />
            )}
            {totalValue > 0 && (
              <View style={styles.totalValueContainer}>
                <Text style={styles.totalValueText}>
                  Total Value: ${totalValue.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}
        <FilterBar
          categories={filterCategories}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />
      </>
    );
  }, [stats, colors, styles, filterCategories, activeFilters, totalValue]);

  const keyExtractor = useCallback((item: Card) => item.id, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.container}>
        <FlatList
          data={filteredCards}
          renderItem={renderCard}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
        />
      </View>
    </SafeAreaView>
  );
};
