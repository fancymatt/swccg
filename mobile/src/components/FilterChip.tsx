import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
  showClearIcon?: boolean;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  isActive,
  onPress,
  showClearIcon = false,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 36,
      paddingLeft: showClearIcon ? 10 : 10,
      paddingRight: 8,
      borderRadius: 10,
      backgroundColor: isActive ? colors.accent : colors.widgetBg,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    icon: {
      width: 18,
      height: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.12,
      color: isActive ? colors.onAccent : colors.fg,
    },
    chevron: {
      width: 13,
      height: 13,
      justifyContent: 'center',
      alignItems: 'center',
    },
    chevronText: {
      fontSize: 10,
      color: isActive ? colors.onAccent : colors.fg,
    },
    clearIcon: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.onAccent,
    },
  });

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {showClearIcon ? (
        <Text style={styles.clearIcon}>✕</Text>
      ) : (
        <>
          <View style={styles.labelContainer}>
            <View style={styles.icon}>
              <Text style={[styles.chevronText, { fontSize: 14 }]}>☰</Text>
            </View>
            <Text style={styles.label}>{label}</Text>
          </View>
          <View style={styles.chevron}>
            <Text style={styles.chevronText}>▾</Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
};
