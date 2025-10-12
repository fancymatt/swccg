import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, ZenDots_400Regular } from '@expo-google-fonts/zen-dots';
import { useEffect, useState, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { LoadingScreen } from './src/components/LoadingScreen';
import { initializeDatabases, seedEncyclopedia } from './src/services/database';
import { SEED_SETS, SEED_CARDS, SEED_SET_CARDS, SEED_VARIANTS } from './src/data/seedData';

// Keep the native splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    ZenDots_400Regular,
  });
  const [dbInitialized, setDbInitialized] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Initializing database...');

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
    async function setupDatabase() {
      try {
        setLoadingMessage('Initializing database...');
        await initializeDatabases();

        setLoadingMessage('Loading card data...');
        const didSeed = await seedEncyclopedia(SEED_SETS, SEED_CARDS, SEED_SET_CARDS, SEED_VARIANTS);

        if (!didSeed) {
          setLoadingMessage('Database ready!');
        }

        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to setup database:', error);
        setLoadingMessage('Error loading database');
      }
    }

    setupDatabase();
  }, []);

  // Show loading screen while initializing
  if (!fontsLoaded || !dbInitialized) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LoadingScreen message={loadingMessage} />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
