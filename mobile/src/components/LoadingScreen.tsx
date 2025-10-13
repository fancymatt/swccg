import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...'
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    spinner: {
      marginBottom: 16,
    },
    message: {
      fontSize: 16,
      color: colors.fg,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={colors.accent}
        style={styles.spinner}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};
