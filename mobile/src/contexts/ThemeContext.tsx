import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';

type ThemeMode = 'system' | 'light' | 'dark';
type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colors: ThemeColors;
  colorScheme: ColorScheme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = '@theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine the actual color scheme based on theme mode and system settings
  const getColorScheme = (mode: ThemeMode, system: 'light' | 'dark' | null | undefined): ColorScheme => {
    if (mode === 'system') {
      return system === 'dark' ? 'dark' : 'light';
    }
    return mode;
  };

  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    getColorScheme(themeMode, systemColorScheme)
  );

  // Load saved theme mode on mount
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && (savedMode === 'system' || savedMode === 'light' || savedMode === 'dark')) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme mode:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadThemeMode();
  }, []);

  // Update color scheme when theme mode or system color scheme changes
  useEffect(() => {
    const newColorScheme = getColorScheme(themeMode, systemColorScheme);
    setColorScheme(newColorScheme);
  }, [themeMode, systemColorScheme]);

  // Compute colors based on color scheme
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  const isDark = colorScheme === 'dark';

  // Update system UI background color when color scheme changes
  useEffect(() => {
    if (isLoaded) {
      SystemUI.setBackgroundColorAsync(colors.bg).catch((error) => {
        console.warn('Failed to set system UI background color:', error);
      });
    }
  }, [colorScheme, isLoaded]);

  // Persist theme mode when it changes
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ colors, colorScheme, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
