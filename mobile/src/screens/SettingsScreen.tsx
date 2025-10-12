import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export const SettingsScreen: React.FC = () => {
  const { colors, themeMode, setThemeMode } = useTheme();

  const themeOptions: Array<{ value: 'system' | 'light' | 'dark'; label: string }> = [
    { value: 'system', label: 'Follow system settings' },
    { value: 'light', label: 'Always light' },
    { value: 'dark', label: 'Always dark' },
  ];

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.widgetBg,
    },
    container: {
      flex: 1,
    },
    header: {
      backgroundColor: colors.bg,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontFamily: 'ZenDots_400Regular',
      color: colors.fg,
    },
    content: {
      padding: 16,
    },
    settingSection: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      padding: 16,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.fg,
      marginBottom: 12,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: colors.widgetBg,
    },
    optionButtonSelected: {
      backgroundColor: colors.accent,
    },
    optionText: {
      fontSize: 16,
      color: colors.fg,
    },
    optionTextSelected: {
      color: colors.onAccent,
      fontWeight: '600',
    },
    checkmark: {
      marginLeft: 'auto',
      fontSize: 18,
      color: colors.onAccent,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>Color theme</Text>
            {themeOptions.map((option) => {
              const isSelected = themeMode === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected,
                  ]}
                  onPress={() => setThemeMode(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};
