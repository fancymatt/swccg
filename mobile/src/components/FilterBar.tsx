import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { FilterChip } from './FilterChip';
import { FilterBottomSheet, FilterOption } from './FilterBottomSheet';

export interface FilterCategory {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface FilterBarProps {
  categories: FilterCategory[];
  activeFilters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  activeFilters,
  onFiltersChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const hasActiveFilters = Object.values(activeFilters).some(
    (values) => values.length > 0
  );

  const handleClearAll = () => {
    const emptyFilters: Record<string, string[]> = {};
    categories.forEach((category) => {
      emptyFilters[category.key] = [];
    });
    onFiltersChange(emptyFilters);
  };

  const handleFilterSelect = (categoryKey: string, values: string[]) => {
    onFiltersChange({
      ...activeFilters,
      [categoryKey]: values,
    });
  };

  const isCategoryActive = (categoryKey: string): boolean => {
    return activeFilters[categoryKey]?.length > 0;
  };

  const currentCategory = categories.find((c) => c.key === selectedCategory);

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {hasActiveFilters && (
            <FilterChip
              label=""
              isActive={true}
              onPress={handleClearAll}
              showClearIcon={true}
            />
          )}

          {categories.map((category) => (
            <FilterChip
              key={category.key}
              label={category.label}
              isActive={isCategoryActive(category.key)}
              onPress={() => setSelectedCategory(category.key)}
            />
          ))}
        </ScrollView>
      </View>

      {currentCategory && (
        <FilterBottomSheet
          visible={selectedCategory !== null}
          title={currentCategory.label}
          options={currentCategory.options}
          selectedValues={activeFilters[currentCategory.key] || []}
          onSelect={(values) => handleFilterSelect(currentCategory.key, values)}
          onClose={() => setSelectedCategory(null)}
          multiSelect={currentCategory.multiSelect !== false}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  scrollContent: {
    gap: 6,
    paddingHorizontal: 16,
  },
});
