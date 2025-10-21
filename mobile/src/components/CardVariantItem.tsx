import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { CardCounter } from './CardCounter';
import type { CardPricing } from '../services/database';
import type { CardVariant } from '../types';

interface CardVariantItemProps {
  variant: CardVariant;
  pricing: CardPricing | null;
  onQuantityChange: (variantId: string, newQuantity: number) => void;
  loadingPricing?: boolean;
}

export const CardVariantItem: React.FC<CardVariantItemProps> = React.memo(({
  variant,
  pricing,
  onQuantityChange,
  loadingPricing = false,
}) => {
  const { colors } = useTheme();

  const handleChange = useCallback(
    (newCount: number) => {
      onQuantityChange(variant.id, newCount);
    },
    [variant.id, onQuantityChange]
  );

  const formattedPrice = useMemo(() => {
    if (loadingPricing) {
      return 'Loading price...';
    }
    if (!pricing || pricing.ungraded_price === null) {
      return 'No price available';
    }
    return `$${(pricing.ungraded_price / 100).toFixed(2)}`;
  }, [pricing, loadingPricing]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.widgetBg,
      borderRadius: 8,
      marginBottom: 8,
    },
    infoContainer: {
      flex: 1,
    },
    variantName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.fg,
      marginBottom: 2,
    },
    variantCode: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    variantDetails: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 2,
    },
    priceText: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '600',
      marginTop: 4,
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.variantName}>{variant.name}</Text>
        {variant.setName && variant.cardNumber && (
          <Text style={styles.variantCode}>
            {variant.setName} #{variant.cardNumber}
          </Text>
        )}
        {variant.details && (
          <Text style={styles.variantDetails}>{variant.details}</Text>
        )}
        <Text style={styles.priceText}>{formattedPrice}</Text>
      </View>

      <CardCounter
        count={variant.quantity}
        onChange={handleChange}
      />
    </View>
  );
});
