import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, ZenDots_400Regular } from '@expo-google-fonts/zen-dots';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { initializeDatabases, seedEncyclopedia } from './src/services/database';
import { SEED_SETS, SEED_CARDS, SEED_SET_CARDS, SEED_VARIANTS } from './src/data/seedData';

export default function App() {
  const [fontsLoaded] = useFonts({
    ZenDots_400Regular,
  });
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    async function setupDatabase() {
      try {
        await initializeDatabases();
        await seedEncyclopedia(SEED_SETS, SEED_CARDS, SEED_SET_CARDS, SEED_VARIANTS);
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to setup database:', error);
      }
    }

    setupDatabase();
  }, []);

  if (!fontsLoaded || !dbInitialized) {
    return null;
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
