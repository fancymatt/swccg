import React, { useCallback, forwardRef, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../contexts/ThemeContext';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBottomSheetProps {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  onClose: () => void;
  multiSelect?: boolean;
}

const FilterBottomSheetComponent = forwardRef(({
  title,
  options,
  selectedValues,
  onSelect,
  onClose,
  multiSelect = true,
}: FilterBottomSheetProps, ref: React.Ref<BottomSheetModal>) => {
  const { colors } = useTheme();

  // Ensure multiSelect is a boolean
  const isMultiSelect = Boolean(multiSelect);

  // Use refs to store latest values without triggering re-renders
  const selectedValuesRef = useRef(selectedValues);
  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);

  // Keep refs up to date
  useEffect(() => {
    selectedValuesRef.current = selectedValues;
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;
  }, [selectedValues, onSelect, onClose]);

  console.log('FilterBottomSheet rendering with selectedValues:', selectedValues);

  const handleOptionPress = useCallback((value: string) => {
    console.log('handleOptionPress called:', value, 'multiSelect:', isMultiSelect);
    if (isMultiSelect) {
      const newValues = selectedValuesRef.current.includes(value)
        ? selectedValuesRef.current.filter((v) => v !== value)
        : [...selectedValuesRef.current, value];
      console.log('Calling onSelect with:', newValues);
      onSelectRef.current(newValues);
      console.log('onSelect completed, NOT calling onClose');
    } else {
      onSelectRef.current([value]);
      onCloseRef.current();
    }
  }, [isMultiSelect]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior={isMultiSelect ? 'none' : 'close'}
      />
    ),
    [isMultiSelect],
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
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
      maxHeight: 400,
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

  const handleDismiss = useCallback(() => {
    console.log('BottomSheetModal onDismiss called');
    onCloseRef.current();
  }, []);

  const handleChange = useCallback((index: number) => {
    console.log('BottomSheetModal onChange called with index:', index);
  }, []);

  return useMemo(() => (
    <BottomSheetModal
      ref={ref}
      snapPoints={['60%']}
      backdropComponent={renderBackdrop}
      onChange={handleChange}
      onDismiss={handleDismiss}
      backgroundStyle={{ backgroundColor: colors.bg }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      enablePanDownToClose={Boolean(!isMultiSelect)}
      enableContentPanningGesture={Boolean(false)}
      enableDynamicSizing={Boolean(false)}
      enableHandlePanningGesture={Boolean(!isMultiSelect)}
      enableOverDrag={Boolean(false)}
    >
      <BottomSheetView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => onCloseRef.current()}
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView style={styles.scrollView}>
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
        </BottomSheetScrollView>

        {isMultiSelect && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => onCloseRef.current()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  ), [ref, colors, title, options, isMultiSelect, renderBackdrop, handleChange, handleDismiss, handleOptionPress]);
});

export const FilterBottomSheet = FilterBottomSheetComponent;
