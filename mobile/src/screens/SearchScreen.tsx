import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useCollectionStats } from '../contexts/CollectionStatsContext';
import { CardListItem } from '../components/CardListItem';
import { searchCardsByName, updateVariantQuantity, getSetCompletionStats } from '../services/database';
import type { Card } from '../types';

export const SearchScreen: React.FC = () => {
  const { colors } = useTheme();
  const { updateSetStats } = useCollectionStats();
  const [searchQuery, setSearchQuery] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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

  const handleVariantQuantityChange = useCallback(async (
    cardId: string,
    variantId: string,
    newQuantity: number
  ) => {
    // Store the old quantity for rollback if needed
    let oldQuantity = 0;
    let setId = '';
    setCards((prevCards) => {
      const card = prevCards.find((card) => card.id === cardId);
      const variant = card?.variants.find((variant) => variant.id === variantId);
      oldQuantity = variant?.quantity ?? 0;
      setId = (card as any)?.setId ?? '';
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

      // Update shared collection stats for the set
      if (setId) {
        const completionStats = await getSetCompletionStats(setId);
        updateSetStats(setId, completionStats);
      }
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
  }, [updateSetStats]);

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
    searchInput: {
      backgroundColor: colors.widgetBg,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.fg,
      borderWidth: 1,
      borderColor: colors.border,
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
      onVariantQuantityChange={handleVariantQuantityChange}
      showSetInfo={true}
    />
  ), [handleVariantQuantityChange]);

  const keyExtractor = useCallback((item: Card, index: number) => `${item.id}-${(item as any).setId}-${index}`, []);

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search card names..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
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
          />
        ) : (
          renderEmpty()
        )}
      </View>
    </SafeAreaView>
  );
};
