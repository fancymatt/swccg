import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { CardListItem } from '../components/CardListItem';
import { getCardsInSet, updateVariantQuantity } from '../services/database';
import type { Card } from '../types';

interface SetCardsScreenProps {
  route: any;
  navigation: any;
}

export const SetCardsScreen: React.FC<SetCardsScreenProps> = ({ route, navigation }) => {
  const { setId, setName } = route.params;
  const { colors } = useTheme();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCards = useCallback(async () => {
    try {
      const cardsData = await getCardsInSet(setId);
      setCards(cardsData as Card[]);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  }, [setId]);

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

  const renderCard = useCallback(({ item }: { item: Card }) => (
    <CardListItem
      card={item}
      onVariantQuantityChange={handleVariantQuantityChange}
    />
  ), [handleVariantQuantityChange]);

  const keyExtractor = useCallback((item: Card) => item.id, []);

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
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <FlatList
          data={cards}
          renderItem={renderCard}
          keyExtractor={keyExtractor}
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
