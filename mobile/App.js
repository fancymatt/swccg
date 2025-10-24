import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts, ZenDots_400Regular } from '@expo-google-fonts/zen-dots';
import { useEffect, useState, useCallback, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { CollectionStatsProvider } from './src/contexts/CollectionStatsContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { LoadingScreen } from './src/components/LoadingScreen';
import { initializeDatabases, seedEncyclopedia } from './src/services/database';
import { SEED_SETS, SEED_CARDS, SEED_SET_CARDS, SEED_VARIANTS, SEED_VARIANT_SET_APPEARANCES } from './src/data/seedData';
import PRICING_DATA from './src/data/card-pricing-data.json';
import VARIANT_PRICING_MAPPINGS from './src/data/variant-pricing-mappings.json';

// Keep the native splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

// Loading screen wrapper with theme-aware StatusBar
function LoadingScreenWithStatusBar({ message }) {
  const { isDark } = useTheme();

  return (
    <>
      <LoadingScreen message={message} />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

// Inner app component that uses theme
function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <TabNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ZenDots_400Regular,
  });
  const [dbInitialized, setDbInitialized] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing database...');

  // Ref to prevent multiple initialization attempts (fixes race condition in React StrictMode)
  const setupCalledRef = useRef(false);

  // Hide splash screen as soon as fonts are loaded so we can show our loading screen
  useEffect(() => {
    async function hideSplash() {
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }
    }
    hideSplash();
  }, [fontsLoaded]);

  useEffect(() => {
    // Prevent multiple initialization attempts (can happen in React StrictMode or hot reload)
    if (setupCalledRef.current) {
      return;
    }
    setupCalledRef.current = true;

    async function setupDatabase() {
      try {
        setLoadingMessage('Initializing database...');
        await initializeDatabases();

        const status = await seedEncyclopedia(SEED_SETS, SEED_CARDS, SEED_SET_CARDS, SEED_VARIANTS, SEED_VARIANT_SET_APPEARANCES, PRICING_DATA, VARIANT_PRICING_MAPPINGS.mappings);

        if (status === 'first-time') {
          setLoadingMessage('Setting up card encyclopedia...');
        } else if (status === 'migration') {
          setLoadingMessage('Migrating card data...');
        } else {
          setLoadingMessage('Loading collection...');
        }

        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to setup database:', error);
        setLoadingMessage('Error loading database');
        // Reset ref on error to allow retry
        setupCalledRef.current = false;
      }
    }

    setupDatabase();
  }, []);

  // Show loading screen while initializing
  if (!fontsLoaded || !dbInitialized) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LoadingScreenWithStatusBar message={loadingMessage} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* BottomSheetModalProvider temporarily disabled until native rebuild */}
          {/* <BottomSheetModalProvider> */}
            <CollectionStatsProvider>
              <NavigationContainer>
                <AppContent />
              </NavigationContainer>
            </CollectionStatsProvider>
          {/* </BottomSheetModalProvider> */}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
