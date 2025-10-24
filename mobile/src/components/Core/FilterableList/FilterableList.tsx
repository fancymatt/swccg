import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../contexts/ThemeContext';
import { useFilterableList } from '../../../hooks/useFilterableList';
import { SearchBar } from './SearchBar';
import { FilterBar } from '../../FilterBar';
import type { FilterableListProps } from './types';
import type { FilterCategory } from '../../FilterBar';

function FilterableList<T = any>({
  items,
  renderItem,
  keyExtractor,
  searchConfig,
  filters = [],
  storageKey,
  initialFilters = {},
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  pageSize = 20,
  onEndReached,
  onEndReachedThreshold = 0.5,
  contentPaddingTop = 0,
  contentPaddingBottom = 32,
  onFiltersChange,
  scrollProps,
}: FilterableListProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Storage functions - memoized to prevent infinite loops
  const loadFilters = useCallback(
    storageKey
      ? async () => {
          try {
            const stored = await AsyncStorage.getItem(storageKey);
            return stored ? JSON.parse(stored) : null;
          } catch (error) {
            console.error('Failed to load filters:', error);
            return null;
          }
        }
      : undefined,
    [storageKey]
  );

  const saveFilters = useCallback(
    storageKey
      ? async (filterData: any) => {
          try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(filterData));
          } catch (error) {
            console.error('Failed to save filters:', error);
          }
        }
      : undefined,
    [storageKey]
  );

  // Convert FilterConfig to filterConfigs for hook
  const filterConfigs = useMemo(
    () =>
      filters.map((f) => ({
        key: f.key,
        filterFn: f.filterFn,
      })),
    [filters]
  );

  // Use filterable list hook
  const {
    filteredItems: filteredByFilters,
    filters: activeFilters,
    setFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useFilterableList({
    items,
    filterConfigs,
    loadFilters,
    saveFilters,
    initialFilters,
  });

  // Notify parent of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(activeFilters);
    }
  }, [activeFilters, onFiltersChange]);

  // Apply search filter if configured
  const searchedItems = useMemo(() => {
    if (
      !searchConfig?.searchFn ||
      searchQuery.trim().length < (searchConfig.minLength || 2)
    ) {
      return filteredByFilters;
    }
    return filteredByFilters.filter((item) =>
      searchConfig.searchFn!(item, searchQuery.trim())
    );
  }, [filteredByFilters, searchQuery, searchConfig]);

  // Pagination
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    setLimit(pageSize);
  }, [activeFilters, searchQuery, pageSize]);

  const pagedData = useMemo(() => {
    return searchedItems.slice(0, limit);
  }, [searchedItems, limit]);

  const loadMore = useCallback(() => {
    const total = searchedItems.length;
    if (limit < total) {
      setLimit((l) => Math.min(l + pageSize, total));
    }
    if (onEndReached) {
      onEndReached();
    }
  }, [searchedItems.length, limit, pageSize, onEndReached]);

  // Handle search debouncing
  useEffect(() => {
    if (!searchConfig?.searchFn) return;

    if (searchQuery.trim().length >= (searchConfig.minLength || 2)) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        setIsSearching(false);
      }, searchConfig.debounceMs || 500);
      return () => clearTimeout(timeoutId);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery, searchConfig]);

  // Handle filter changes from FilterBar
  const handleFiltersChange = useCallback(
    (newFilters: Record<string, string[]>) => {
      Object.entries(newFilters).forEach(([key, value]) => {
        setFilter(key, value);
      });
    },
    [setFilter]
  );

  // Convert filters to FilterCategory format for FilterBar
  const filterCategories: FilterCategory[] = useMemo(() => {
    return filters.map((filter) => ({
      key: filter.key,
      label: filter.label,
      options: filter.options,
      multiSelect: filter.multiSelect !== false,
    }));
  }, [filters]);

  // List header with search and filters
  const listHeader = useMemo(() => {
    return (
      <>
        {ListHeaderComponent}
        {searchConfig && (
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={searchConfig.placeholder || 'Search...'}
            isSearching={isSearching}
          />
        )}
        {filterCategories.length > 0 && (
          <FilterBar
            categories={filterCategories}
            activeFilters={activeFilters}
            onFiltersChange={handleFiltersChange}
          />
        )}
      </>
    );
  }, [
    ListHeaderComponent,
    searchConfig,
    searchQuery,
    isSearching,
    filterCategories,
    activeFilters,
    handleFiltersChange,
  ]);

  return (
    <View style={styles.container}>
      <FlatList
        {...scrollProps}
        data={pagedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          searchedItems.length > pagedData.length ? (
            <ActivityIndicator style={styles.loadingIndicator} />
          ) : (
            ListFooterComponent
          )
        }
        ListEmptyComponent={ListEmptyComponent}
        onEndReached={loadMore}
        onEndReachedThreshold={onEndReachedThreshold}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
          paddingBottom: contentPaddingBottom,
        }}
      />
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    loadingIndicator: {
      marginVertical: 16,
    },
  });

export default FilterableList;
