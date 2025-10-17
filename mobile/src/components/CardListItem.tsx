import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { CardVariantItem } from './CardVariantItem';
import { CardTypeIcon } from './CardTypeIcon';
import type { Card } from '../types';

interface CardListItemProps {
  card: Card;
  onVariantQuantityChange: (cardId: string, variantId: string, newQuantity: number) => void;
  showSetInfo?: boolean;
}

export const CardListItem: React.FC<CardListItemProps> = React.memo(({
  card,
  onVariantQuantityChange,
  showSetInfo = false,
}) => {
  const { colors } = useTheme();

  const getSideColor = (side: 'light' | 'dark') => {
    return side === 'light' ? colors.lightSide : colors.darkSide;
  };

  const normalizeRarity = (rarity: string | undefined): string => {
    if (!rarity) return 'Unknown';
    const rarityUpper = rarity.toUpperCase();
    if (rarityUpper.startsWith('C')) return 'Common';
    if (rarityUpper.startsWith('U')) return 'Uncommon';
    if (rarityUpper.startsWith('R')) return 'Rare';
    return 'Other';
  };

  const getRarityColor = (rarity: string | undefined): string => {
    const normalized = normalizeRarity(rarity);
    switch (normalized) {
      case 'Common':
        return '#10b981';
      case 'Uncommon':
        return '#3b82f6';
      case 'Rare':
        return '#f59e0b';
      default:
        return '#8b5cf6';
    }
  };

  const totalQuantity = useMemo(
    () => card.variants.reduce((sum, v) => sum + v.quantity, 0),
    [card.variants]
  );

  const handleVariantChange = useCallback(
    (variantId: string, newQuantity: number) => {
      onVariantQuantityChange(card.id, variantId, newQuantity);
    },
    [card.id, onVariantQuantityChange]
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.cardBg,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    sideIndicator: {
      width: 4,
      height: 20,
      borderRadius: 2,
      marginRight: 8,
    },
    typeIconWrapper: {
      marginRight: 8,
    },
    cardName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.fg,
      flex: 1,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginLeft: 12,
    },
    cardNumber: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    separator: {
      fontSize: 14,
      color: colors.buttonDisabled,
      marginHorizontal: 6,
    },
    sideText: {
      fontSize: 14,
      fontWeight: '600',
    },
    cardType: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    rarity: {
      fontSize: 14,
      fontWeight: '600',
    },
    totalOwned: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '600',
    },
    setInfo: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
    },
    variantsContainer: {
      marginTop: 4,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.sideIndicator, { backgroundColor: getSideColor(card.side) }]} />
          <View style={styles.typeIconWrapper}>
            <CardTypeIcon
              cardType={card.type}
              icon={card.icon}
              iconColor={card.iconColor}
              size={16}
            />
          </View>
          <Text style={styles.cardName}>{card.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.cardNumber}>#{card.cardNumber}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={[styles.sideText, { color: getSideColor(card.side) }]}>
            {card.side === 'light' ? 'Light' : 'Dark'}
          </Text>
          <Text style={styles.separator}>•</Text>
          <Text style={styles.cardType}>{card.type}</Text>
          <Text style={styles.separator}>•</Text>
          <Text style={[styles.rarity, { color: getRarityColor(card.rarity) }]}>
            {normalizeRarity(card.rarity)}
          </Text>
          {showSetInfo && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.setInfo}>{card.setName}</Text>
            </>
          )}
          {totalQuantity > 0 && (
            <>
              <Text style={styles.separator}>•</Text>
              <Text style={styles.totalOwned}>{totalQuantity} owned</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.variantsContainer}>
        {card.variants.map((variant) => (
          <CardVariantItem
            key={variant.id}
            variant={variant}
            onQuantityChange={handleVariantChange}
          />
        ))}
      </View>
    </View>
  );
});
