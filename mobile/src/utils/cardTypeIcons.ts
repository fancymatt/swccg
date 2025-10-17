/**
 * Card Type Icon Configuration
 *
 * Maps card type icon identifiers to their PNG assets
 */

// Icon mapping for card types
const iconMap: Record<string, any> = {
  'icon_cardtype_character-alien': require('../../assets/icons_cardtypes/icon_cardtype_character-alien.png'),
  'icon_cardtype_default': require('../../assets/icons_cardtypes/icon_cardtype_default.png'),
};

/**
 * Default icons for card types
 * Maps card type names to their icon identifiers
 */
export const CARD_TYPE_ICONS: Record<string, string> = {
  'Character - Alien': 'icon_cardtype_character-alien',
  // All other types use default icon
};

/**
 * Get the icon image source for a card type
 * @param cardType The type of the card
 * @param iconOverride Optional icon override from the card data
 * @returns The image source for the icon
 */
export const getCardTypeIcon = (
  cardType: string,
  iconOverride?: string
): any => {
  // If card has a specific icon override, use it
  if (iconOverride && iconMap[iconOverride]) {
    return iconMap[iconOverride];
  }

  // Otherwise, use the default icon for the card type
  const iconId = CARD_TYPE_ICONS[cardType];
  if (iconId && iconMap[iconId]) {
    return iconMap[iconId];
  }

  // Default fallback icon
  return iconMap['icon_cardtype_default'];
};
