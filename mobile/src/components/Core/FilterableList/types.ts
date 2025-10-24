// FilterableList types
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
  filterFn?: (item: any, selectedValues: string[]) => boolean;
}

export interface FilterableListProps<T> {
  items: T[];
  renderItem: (props: { item: T; index: number }) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;

  // Search configuration
  searchConfig?: {
    searchFn: (item: T, query: string) => boolean;
    placeholder?: string;
    minLength?: number;
    debounceMs?: number;
  };

  // Filter configuration
  filters?: FilterConfig[];
  storageKey?: string;
  initialFilters?: Record<string, string[]>;

  // List customization
  ListHeaderComponent?: React.ReactNode;
  ListFooterComponent?: React.ReactNode;
  ListEmptyComponent?: React.ReactNode;

  // Pagination
  pageSize?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;

  // Styling
  contentPaddingTop?: number;
  contentPaddingBottom?: number;

  // Callbacks
  onFiltersChange?: (filters: Record<string, string[]>) => void;

  // Pass-through props for FlatList
  scrollProps?: any;
}
