/**
 * Card Type Icon Configuration
 *
 * Defines the icon colors and optional SVG paths for different card types.
 * Individual cards can override these via the icon and iconColor properties.
 */

export interface CardTypeIconConfig {
  color: string;
  icon?: string; // Optional SVG path or icon identifier
}

/**
 * Default icon colors (and eventually icons) for card types
 */
export const CARD_TYPE_ICONS: Record<string, CardTypeIconConfig> = {
  'Effect': {
    color: '#10b981', // green
  },
  'Interrupt': {
    color: '#ef4444', // red
  },
  'Character': {
    color: '#3b82f6', // blue
  },
  'Device': {
    color: '#f59e0b', // orange
  },
  'Location': {
    color: '#8b5cf6', // purple
  },
  'Starship': {
    color: '#06b6d4', // cyan
  },
  'Vehicle': {
    color: '#f97316', // orange
  },
  'Weapon': {
    color: '#64748b', // slate
  },
  'Creature': {
    color: '#84cc16', // lime
  },
  'Epic Event': {
    color: '#ec4899', // pink
  },
};

/**
 * Get the icon path for a card type
 * @param cardType The type of the card
 * @param iconOverride Optional icon override from the card data
 * @returns The icon path/identifier to use, or undefined if none available
 */
export const getCardTypeIcon = (
  cardType: string,
  iconOverride?: string
): string | undefined => {
  // If card has a specific icon override, use it
  if (iconOverride) {
    return iconOverride;
  }

  // Otherwise, use the default icon for the card type
  const config = CARD_TYPE_ICONS[cardType];
  return config?.icon;
};

/**
 * Get the icon color for a card type
 * @param cardType The type of the card
 * @param iconColorOverride Optional color override from the card data
 * @returns The color to use for the icon
 */
export const getCardTypeIconColor = (
  cardType: string,
  iconColorOverride?: string
): string => {
  // If card has a specific icon color override, use it
  if (iconColorOverride) {
    return iconColorOverride;
  }

  // Otherwise, use the default color for the card type
  const config = CARD_TYPE_ICONS[cardType];
  if (config) {
    return config.color;
  }

  // Default fallback color (gray)
  return '#94a3b8';
};
