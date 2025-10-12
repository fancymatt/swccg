import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { CardListItem } from '../components/CardListItem';
import { getCardsWithCollection, updateVariantQuantity } from '../services/database';
import type { Card } from '../types';

export const SampleCardsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const cardsData = await getCardsWithCollection();
      setCards(cardsData as Card[]);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantQuantityChange = async (
    cardId: string,
    variantId: string,
    newQuantity: number
  ) => {
    try {
      // Update database
      await updateVariantQuantity(variantId, newQuantity);

      // Update local state
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
    } catch (error) {
      console.error('Failed to update variant quantity:', error);
    }
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.widgetBg,
    },
    container: {
      flex: 1,
    },
    header: {
      backgroundColor: colors.bg,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontFamily: 'ZenDots_400Regular',
      color: colors.fg,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>SWCCG Collection Tracker</Text>
            <Text style={styles.subtitle}>Sample Cards</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>SWCCG Collection Tracker</Text>
          <Text style={styles.subtitle}>Sample Cards</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {cards.map((card) => (
            <CardListItem
              key={card.id}
              card={card}
              onVariantQuantityChange={handleVariantQuantityChange}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
