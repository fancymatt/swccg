/**
 * Icon mapping utilities
 * Centralized icon mappings for sets, sides, and card types
 */

/**
 * Set icon mappings
 * Maps icon path strings to actual image assets
 */
export const setIconMap: Record<string, any> = {
  icon_set_anewhope: require('../../assets/icons_sets/icon_set_anewhope.png'),
  icon_set_hoth: require('../../assets/icons_sets/icon_set_hoth.png'),
  icon_set_default: require('../../assets/icons_sets/icon_set_default.png'),
};

/**
 * Side icon mappings
 * Maps 'light' and 'dark' sides to their respective icons
 */
export const sideIconMap = {
  light: require('../../assets/icons_darklight/icon_darklight_light.png'),
  dark: require('../../assets/icons_darklight/icon_darklight_dark.png'),
};

/**
 * Get the appropriate set icon for a given icon path
 *
 * @param iconPath - The icon path from the database (e.g., "icon_set_hoth")
 * @returns The image asset for the set icon, or default icon if not found
 *
 * @example
 * getSetIcon("icon_set_hoth") // returns hoth set icon
 * getSetIcon(undefined) // returns default icon
 */
export function getSetIcon(iconPath?: string): any {
  if (iconPath && setIconMap[iconPath]) {
    return setIconMap[iconPath];
  }
  return setIconMap['icon_set_default'];
}

/**
 * Get the appropriate side icon for light or dark side
 *
 * @param side - The side of the card ('light' or 'dark')
 * @returns The image asset for the side icon
 *
 * @example
 * getSideIcon('light') // returns light side icon
 * getSideIcon('dark') // returns dark side icon
 */
export function getSideIcon(side: 'light' | 'dark'): any {
  return sideIconMap[side];
}

/**
 * Get the color associated with a card side
 *
 * @param side - The side of the card ('light' or 'dark')
 * @param colors - The theme colors object
 * @returns The color hex code for the side
 *
 * @example
 * getSideColor('light', colors) // returns colors.lightSide
 * getSideColor('dark', colors) // returns colors.darkSide
 */
export function getSideColor(
  side: 'light' | 'dark',
  colors: { lightSide: string; darkSide: string }
): string {
  return side === 'light' ? colors.lightSide : colors.darkSide;
}

/**
 * Get the display name for a card side
 *
 * @param side - The side of the card ('light' or 'dark')
 * @returns The capitalized display name
 *
 * @example
 * getSideDisplayName('light') // returns 'Light'
 * getSideDisplayName('dark') // returns 'Dark'
 */
export function getSideDisplayName(side: 'light' | 'dark'): string {
  return side === 'light' ? 'Light' : 'Dark';
}
