export const lightColors = {
  // Core backgrounds
  bg: '#ffffff',
  fg: '#000000',
  widgetBg: '#f0f7ff',
  cardBg: '#ffffff',
  screenBg: '#f5f5f5',

  // Borders and dividers
  border: '#E5E5EA',
  divider: '#E5E5EA',

  // Text colors
  textMain: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textDisabled: '#8E8E93',
  textInverse: '#ffffff',

  // Interactive colors
  accent: '#007AFF',
  accentLight: '#E3F2FF',
  onAccent: '#ffffff',

  // Status colors
  success: '#34C759',
  successLight: '#E8F5E9',
  warning: '#FF9500',
  warningLight: '#FFF4E5',
  error: '#FF3B30',
  errorLight: '#FFEBEE',
  info: '#5AC8FA',
  infoLight: '#E3F2FD',

  // Side-specific colors
  lightSide: '#4A90E2',
  lightSideLight: '#E3F2FF',
  darkSide: '#E24A4A',
  darkSideLight: '#FFEBEE',

  // Rarity colors
  rarityPremium: '#FFD700',
  rarityRare: '#FF6B6B',
  rarityUncommon: '#4ECDC4',
  rarityCommon: '#95A5A6',

  // Button colors
  buttonBg: '#007AFF',
  buttonText: '#ffffff',
  buttonDisabled: '#C7C7CC',
  buttonDisabledText: '#8E8E93',

  // Navigation colors
  tabBarBg: '#ffffff',
  tabBarBorder: '#E5E5EA',
  tabBarActiveTint: '#007AFF',
  tabBarInactiveTint: '#8E8E93',
  headerBg: '#ffffff',
  headerText: '#000000',

  // Card and overlay colors
  card: '#ffffff',
  cardBorder: '#E5E5EA',
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.3)',

  // Shadow
  shadowColor: '#000000',

  // Search and input
  inputBg: '#F2F2F7',
  inputBorder: '#E5E5EA',
  inputText: '#000000',
  inputPlaceholder: '#8E8E93',
};

export const darkColors = {
  // Core backgrounds
  bg: '#000000',
  fg: '#ffffff',
  widgetBg: '#1a1a2e',
  cardBg: '#1a1a1a',
  screenBg: '#0a0a0a',

  // Borders and dividers
  border: '#3a3a3c',
  divider: '#3a3a3c',

  // Text colors
  textMain: '#ffffff',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  textDisabled: '#636366',
  textInverse: '#000000',

  // Interactive colors
  accent: '#0A84FF',
  accentLight: '#1a2b3d',
  onAccent: '#ffffff',

  // Status colors
  success: '#32D74B',
  successLight: '#1a2e1f',
  warning: '#FF9F0A',
  warningLight: '#2e2419',
  error: '#FF453A',
  errorLight: '#2e1a1a',
  info: '#64D2FF',
  infoLight: '#1a2a3d',

  // Side-specific colors
  lightSide: '#64A9FF',
  lightSideLight: '#1a2b3d',
  darkSide: '#FF6B6B',
  darkSideLight: '#2e1a1a',

  // Rarity colors
  rarityPremium: '#FFD700',
  rarityRare: '#FF6B6B',
  rarityUncommon: '#4ECDC4',
  rarityCommon: '#95A5A6',

  // Button colors
  buttonBg: '#0A84FF',
  buttonText: '#ffffff',
  buttonDisabled: '#3a3a3c',
  buttonDisabledText: '#636366',

  // Navigation colors
  tabBarBg: '#1a1a1a',
  tabBarBorder: '#3a3a3c',
  tabBarActiveTint: '#0A84FF',
  tabBarInactiveTint: '#8E8E93',
  headerBg: '#1a1a1a',
  headerText: '#ffffff',

  // Card and overlay colors
  card: '#1a1a1a',
  cardBorder: '#3a3a3c',
  overlay: 'rgba(0, 0, 0, 0.7)',
  backdrop: 'rgba(0, 0, 0, 0.5)',

  // Shadow
  shadowColor: '#000000',

  // Search and input
  inputBg: '#2a2a2c',
  inputBorder: '#3a3a3c',
  inputText: '#ffffff',
  inputPlaceholder: '#8E8E93',
};

export type ThemeColors = typeof lightColors;
