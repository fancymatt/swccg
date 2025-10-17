import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { getCardTypeIcon } from '../utils/cardTypeIcons';

interface CardTypeIconProps {
  cardType: string;
  icon?: string;
  size?: number;
}

/**
 * CardTypeIcon Component
 *
 * Renders a PNG icon for the card type
 */
export const CardTypeIcon: React.FC<CardTypeIconProps> = ({
  cardType,
  icon,
  size = 16,
}) => {
  const iconSource = getCardTypeIcon(cardType, icon);

  return (
    <Image
      source={iconSource}
      style={[
        styles.icon,
        {
          width: size,
          height: size,
        },
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    // Base styles for the icon
  },
});
