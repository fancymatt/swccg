import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SetsListScreen } from '../screens/SetsListScreen';
import { SetCardsScreen } from '../screens/SetCardsScreen';
import { useTheme } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export type CollectionStackParamList = {
  SetsList: undefined;
  SetCards: { setId: string; setName: string };
};

const Stack = createNativeStackNavigator<CollectionStackParamList>();

// Wrap screens with ErrorBoundary for graceful error handling
const SetsListScreenWithErrorBoundary = (props: any) => (
  <ErrorBoundary>
    <SetsListScreen {...props} />
  </ErrorBoundary>
);

const SetCardsScreenWithErrorBoundary = (props: any) => (
  <ErrorBoundary>
    <SetCardsScreen {...props} />
  </ErrorBoundary>
);

export const CollectionStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
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
        component={SetsListScreenWithErrorBoundary}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SetCards"
        component={SetCardsScreenWithErrorBoundary}
        options={({ route }) => ({
          title: route.params.setName,
        })}
      />
    </Stack.Navigator>
  );
};
