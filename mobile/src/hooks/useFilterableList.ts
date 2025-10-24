import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

export interface FilterConfig {
  key: string;
  filterFn?: (item: any, selectedValues: string[]) => boolean;
}

export interface UseFilterableListOptions<T> {
  items: T[];
  filterConfigs?: FilterConfig[];
  loadFilters?: () => Promise<any>;
  saveFilters?: (filters: any) => Promise<void>;
  initialFilters?: Record<string, string[]>;
}

export interface UseFilterableListReturn<T> {
  filteredItems: T[];
  filters: Record<string, string[]>;
  setFilter: (key: string, value: string[]) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

export function useFilterableList<T = any>({
  items,
  filterConfigs = [],
  loadFilters,
  saveFilters,
  initialFilters = {},
}: UseFilterableListOptions<T>): UseFilterableListReturn<T> {
  const [filters, setFilters] = useState<Record<string, string[]>>(initialFilters);
  const hasLoadedRef = useRef(false);
  const loadFiltersRef = useRef(loadFilters);
  const saveFiltersRef = useRef(saveFilters);

  // Update refs when functions change
  useEffect(() => {
    loadFiltersRef.current = loadFilters;
  }, [loadFilters]);

  useEffect(() => {
    saveFiltersRef.current = saveFilters;
  }, [saveFilters]);

  // Load saved filters on mount - only once
  useEffect(() => {
    if (!hasLoadedRef.current && loadFiltersRef.current) {
      hasLoadedRef.current = true;
      const load = async () => {
        try {
          const savedFilters = await loadFiltersRef.current!();
          if (savedFilters) {
            setFilters(savedFilters);
          }
        } catch (error) {
          console.error('Failed to load filters:', error);
        }
      };
      load();
    }
  }, []);

  // Save filters whenever they change
  useEffect(() => {
    if (hasLoadedRef.current && saveFiltersRef.current) {
      saveFiltersRef.current(filters).catch((error) => {
        console.error('Failed to save filters:', error);
      });
    }
  }, [filters]);

  // Apply all filters
  const filteredItems = useMemo(() => {
    let result = [...items];

    filterConfigs.forEach((config) => {
      const filterValue = filters[config.key];
      if (filterValue && Array.isArray(filterValue) && filterValue.length > 0) {
        if (config.filterFn) {
          result = result.filter((item) => config.filterFn!(item, filterValue));
        }
      }
    });

    return result;
  }, [items, filters, filterConfigs]);

  // Set a specific filter
  const setFilter = useCallback((key: string, value: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear a specific filter
  const clearFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((value) => {
      return Array.isArray(value) && value.length > 0;
    });
  }, [filters]);

  return {
    filteredItems,
    filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}
