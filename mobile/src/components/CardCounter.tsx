import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface CardCounterProps {
  count: number;
  onChange: (newCount: number) => void;
  min?: number;
  max?: number;
}

export const CardCounter: React.FC<CardCounterProps> = ({
  count,
  onChange,
  min = 0,
  max = 99,
}) => {
  const { colors } = useTheme();

  const handleDecrement = () => {
    if (count > min) {
      onChange(count - 1);
    }
  };

  const handleIncrement = () => {
    if (count < max) {
      onChange(count + 1);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    button: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDisabled: {
      backgroundColor: colors.buttonDisabled,
    },
    buttonText: {
      color: colors.bg,
      fontSize: 24,
      fontWeight: '600',
    },
    buttonTextDisabled: {
      color: colors.textDisabled,
    },
    countContainer: {
      minWidth: 40,
      alignItems: 'center',
    },
    countText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.fg,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, count <= min && styles.buttonDisabled]}
        onPress={handleDecrement}
        disabled={count <= min}
      >
        <Text style={[styles.buttonText, count <= min && styles.buttonTextDisabled]}>
          −
        </Text>
      </TouchableOpacity>

      <View style={styles.countContainer}>
        <Text style={styles.countText}>{count}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, count >= max && styles.buttonDisabled]}
        onPress={handleIncrement}
        disabled={count >= max}
      >
        <Text style={[styles.buttonText, count >= max && styles.buttonTextDisabled]}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
};
