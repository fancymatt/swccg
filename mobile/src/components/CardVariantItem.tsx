import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { CardCounter } from './CardCounter';
import type { CardVariant } from '../types';

interface CardVariantItemProps {
  variant: CardVariant;
  onQuantityChange: (variantId: string, newQuantity: number) => void;
}

export const CardVariantItem: React.FC<CardVariantItemProps> = ({
  variant,
  onQuantityChange,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
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
  });

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.variantName}>{variant.name}</Text>
        <Text style={styles.variantCode}>{variant.code}</Text>
      </View>

      <CardCounter
        count={variant.quantity}
        onChange={(newCount) => onQuantityChange(variant.id, newCount)}
      />
    </View>
  );
};
