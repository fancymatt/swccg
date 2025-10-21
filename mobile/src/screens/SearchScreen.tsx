import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { CardListItem } from '../components/CardListItem';
import { searchCardsByName, updateVariantQuantity, getBatchVariantPricing, CardPricing } from '../services/database';
import type { Card } from '../types';

export const SearchScreen: React.FC = () => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pricingMap, setPricingMap] = useState<Map<string, CardPricing>>(new Map());

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setLoading(true);
        setHasSearched(true);
        try {
          const results = await searchCardsByName(searchQuery.trim());
          setCards(results as Card[]);
        } catch (error) {
          console.error('Failed to search cards:', error);
          // On error, show empty results instead of crashing
          setCards([]);
        } finally {
          setLoading(false);
        }
      } else {
        setCards([]);
        setHasSearched(false);
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch pricing whenever cards change
  useEffect(() => {
    async function fetchPricing() {
      if (cards.length === 0) {
        setPricingMap(new Map());
        return;
      }

      // Collect all variant IDs from all cards
      const variantIds: string[] = [];
      for (const card of cards) {
        for (const variant of card.variants) {
          variantIds.push(variant.id);
        }
      }

      // Fetch all pricing data in a single batch query
      const pricing = await getBatchVariantPricing(variantIds);
      setPricingMap(pricing);
    }

    fetchPricing();
  }, [cards]);

  const handleVariantQuantityChange = useCallback(async (
    cardId: string,
    variantId: string,
    newQuantity: number
  ) => {
    // Store the old quantity for rollback if needed
    let oldQuantity = 0;
    setCards((prevCards) => {
      const card = prevCards.find((card) => card.id === cardId);
      const variant = card?.variants.find((variant) => variant.id === variantId);
      oldQuantity = variant?.quantity ?? 0;
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

      // Note: Set stats updates are handled by the updateVariantQuantity function
      // which invalidates the cache for all affected sets
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
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.widgetBg,
    },
    container: {
      flex: 1,
    },
    searchContainer: {
      backgroundColor: colors.bg,
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInputWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.widgetBg,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingRight: 48,
      fontSize: 16,
      color: colors.fg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearButton: {
      position: 'absolute',
      right: 8,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.textSecondary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clearButtonText: {
      color: colors.widgetBg,
      fontSize: 16,
      fontWeight: '600',
    },
    listContent: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    resultCount: {
      fontSize: 14,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
  }), [colors]);

  const renderCard = useCallback(({ item }: { item: Card }) => (
    <CardListItem
      card={item}
      pricingMap={pricingMap}
      onVariantQuantityChange={handleVariantQuantityChange}
      showSetInfo={true}
    />
  ), [handleVariantQuantityChange, pricingMap]);

  const keyExtractor = useCallback((item: Card) => item.id, []);

  const renderHeader = useCallback(() => {
    if (cards.length > 0) {
      return (
        <Text style={styles.resultCount}>
          {cards.length} result{cards.length !== 1 ? 's' : ''} found
        </Text>
      );
    }
    return null;
  }, [cards.length, styles.resultCount]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      );
    }

    if (hasSearched && searchQuery.trim().length > 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No cards found matching "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Search for cards by name
        </Text>
      </View>
    );
  }, [loading, hasSearched, searchQuery, colors.accent, styles]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search card names..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {cards.length > 0 ? (
          <FlatList
            data={cards}
            renderItem={renderCard}
            keyExtractor={keyExtractor}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={5}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          renderEmpty()
        )}
      </View>
    </SafeAreaView>
  );
};
