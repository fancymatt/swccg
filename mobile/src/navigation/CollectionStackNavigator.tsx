import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SetsListScreen } from '../screens/SetsListScreen';
import { SetCardsScreen } from '../screens/SetCardsScreen';
import { useTheme } from '../contexts/ThemeContext';
import { CollectionStatsProvider } from '../contexts/CollectionStatsContext';

export type CollectionStackParamList = {
  SetsList: undefined;
  SetCards: { setId: string; setName: string };
};

const Stack = createNativeStackNavigator<CollectionStackParamList>();

export const CollectionStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <CollectionStatsProvider>
      <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.bg,
        },
        headerTintColor: colors.accent,
        headerTitleStyle: {
          fontFamily: 'ZenDots_400Regular',
          color: colors.fg,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SetsList"
        component={SetsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SetCards"
        component={SetCardsScreen}
        options={({ route }) => ({
          title: route.params.setName,
        })}
      />
    </Stack.Navigator>
    </CollectionStatsProvider>
  );
};
