import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { CardCounter } from './CardCounter';
import type { CardVariant } from '../types';

interface CardVariantItemProps {
  variant: CardVariant;
  onQuantityChange: (variantId: string, newQuantity: number) => void;
}

export const CardVariantItem: React.FC<CardVariantItemProps> = React.memo(({
  variant,
  onQuantityChange,
}) => {
  const { colors } = useTheme();

  const handleChange = useCallback(
    (newCount: number) => {
      onQuantityChange(variant.id, newCount);
    },
    [variant.id, onQuantityChange]
  );

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
  }), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.variantName}>{variant.name}</Text>
        {variant.details && (
          <Text style={styles.variantDetails}>{variant.details}</Text>
        )}
      </View>

      <CardCounter
        count={variant.quantity}
        onChange={handleChange}
      />
    </View>
  );
});
