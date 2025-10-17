import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getCardTypeIcon, getCardTypeIconColor } from '../utils/cardTypeIcons';

interface CardTypeIconProps {
  cardType: string;
  icon?: string;
  iconColor?: string;
  size?: number;
}

/**
 * CardTypeIcon Component
 *
 * Renders either an SVG icon (when available) or a colored circle fallback.
 * This component is future-ready for SVG icons while currently displaying colored circles.
 */
export const CardTypeIcon: React.FC<CardTypeIconProps> = ({
  cardType,
  icon,
  iconColor,
  size = 16,
}) => {
  const iconPath = getCardTypeIcon(cardType, icon);
  const color = getCardTypeIconColor(cardType, iconColor);

  // TODO: When SVG support is added, check if iconPath exists and render the SVG
  // For now, we always render a colored circle
  if (iconPath) {
    // Future implementation: Render SVG icon here
    // import { SvgIcon } from 'react-native-svg' or similar
    // return <SvgIcon source={iconPath} size={size} />;

    // Placeholder: For now, still render colored circle even if icon is defined
    // This makes it easier to test the icon property before SVGs are implemented
    return (
      <View
        style={[
          styles.iconCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    );
  }

  // Fallback: Render colored circle
  return (
    <View
      style={[
        styles.iconCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  iconCircle: {
    // Base styles for the circle
  },
});
