import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  isSearching?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  isSearching = false,
}) => {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.widgetBg,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.border,
        },
        input: {
          flex: 1,
          fontSize: 16,
          color: colors.fg,
        },
        loadingIndicator: {
          marginLeft: 8,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color={colors.accent}
            style={styles.loadingIndicator}
          />
        )}
      </View>
    </View>
  );
};
