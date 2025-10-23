import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBottomSheetProps {
  visible: boolean;
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  onClose: () => void;
  multiSelect?: boolean;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  title,
  options,
  selectedValues,
  onSelect,
  onClose,
  multiSelect = true,
}) => {
  const { colors } = useTheme();

  const handleOptionPress = (value: string) => {
    if (multiSelect) {
      const newValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      onSelect(newValues);
    } else {
      onSelect([value]);
      onClose();
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.fg,
    },
    closeButton: {
      padding: 4,
    },
    closeText: {
      fontSize: 24,
      color: colors.textSecondary,
    },
    scrollView: {
      paddingTop: 8,
      flex: 1,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    optionText: {
      fontSize: 16,
      color: colors.fg,
    },
    checkmark: {
      fontSize: 18,
      color: colors.accent,
      fontWeight: 'bold',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    doneButton: {
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: 'center',
    },
    doneButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={multiSelect ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Text style={styles.closeText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollView}>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.option}
                      onPress={() => handleOptionPress(option.value)}
                    >
                      <Text style={styles.optionText}>{option.label}</Text>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {multiSelect && (
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={onClose}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
