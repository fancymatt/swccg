import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useCollectionStats } from '../contexts/CollectionStatsContext';
import { CardListItem } from '../components/CardListItem';
import { ProgressBar } from '../components/ProgressBar';
import { getCardsInSet, updateVariantQuantity, getSetCompletionStats, SetCompletionStats } from '../services/database';
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

  const loadCards = useCallback(async () => {
    try {
      const cardsData = await getCardsInSet(setId);
      setCards(cardsData as Card[]);

      // Load completion stats
      const completionStats = await getSetCompletionStats(setId);
      setStats(completionStats);

      // Update shared collection stats
      updateSetStats(setId, completionStats);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  }, [setId, updateSetStats]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

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

      // Reload stats to update progress bars
      const completionStats = await getSetCompletionStats(setId);
      setStats(completionStats);

      // Update shared collection stats
      updateSetStats(setId, completionStats);
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
  }, [setId, updateSetStats]);

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
  }), [colors]);

  const renderCard = useCallback(({ item }: { item: Card }) => (
    <CardListItem
      card={item}
      onVariantQuantityChange={handleVariantQuantityChange}
    />
  ), [handleVariantQuantityChange]);

  const renderHeader = useCallback(() => {
    if (!stats) return null;

    return (
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
      </View>
    );
  }, [stats, colors, styles]);

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
      </View>
    </SafeAreaView>
  );
};
