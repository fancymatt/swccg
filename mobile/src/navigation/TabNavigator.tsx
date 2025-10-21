import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CollectionStackNavigator } from './CollectionStackNavigator';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

const Tab = createBottomTabNavigator();

// Wrap screens with ErrorBoundary for graceful error handling
const SearchScreenWithErrorBoundary = (props: any) => (
  <ErrorBoundary>
    <SearchScreen {...props} />
  </ErrorBoundary>
);

const SettingsScreenWithErrorBoundary = (props: any) => (
  <ErrorBoundary>
    <SettingsScreen {...props} />
  </ErrorBoundary>
);

export const TabNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen
        name="Collection"
        component={CollectionStackNavigator}
        options={{
          tabBarLabel: 'Collection',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreenWithErrorBoundary}
        options={{
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreenWithErrorBoundary}
        options={{
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
};
