import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useCollectionStats } from '../contexts/CollectionStatsContext';
import { getAllSets, getSetCompletionStats } from '../services/database';
import { ProgressBar } from '../components/ProgressBar';
import { FilterBar, FilterCategory } from '../components/FilterBar';

interface Set {
  id: string;
  name: string;
  abbreviation?: string;
  release_date?: string;
  icon_path?: string;
}

interface SetsListScreenProps {
  navigation: any;
}

// Icon mapping
const iconMap: Record<string, any> = {
  icon_set_anewhope: require('../../assets/icons_sets/icon_set_anewhope.png'),
  icon_set_hoth: require('../../assets/icons_sets/icon_set_hoth.png'),
  icon_set_default: require('../../assets/icons_sets/icon_set_default.png'),
};

export const SetsListScreen: React.FC<SetsListScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { setStats, setAllStats } = useCollectionStats();
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({
    edition: [],
    size: [],
  });

  const getSetIcon = (iconPath?: string) => {
    if (iconPath && iconMap[iconPath]) {
      return iconMap[iconPath];
    }
    return iconMap['icon_set_default'];
  };

  const loadSets = useCallback(async () => {
    try {
      const setsData = await getAllSets();
      setSets(setsData as Set[]);

      // Load stats for each set
      const statsMap: Record<string, import('../services/database').SetCompletionStats> = {};
      for (const set of setsData) {
        try {
          const stats = await getSetCompletionStats(set.id);
          statsMap[set.id] = stats;
        } catch (error) {
          console.error(`Failed to load stats for set ${set.id}:`, error);
        }
      }
      setAllStats(statsMap);
    } catch (error) {
      console.error('Failed to load sets:', error);
    } finally {
      setLoading(false);
    }
  }, [setAllStats]);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  const handleSetPress = (set: Set) => {
    navigation.navigate('SetCards', {
      setId: set.id,
      setName: set.name
    });
  };

  // Define filter categories
  const filterCategories: FilterCategory[] = useMemo(() => [
    {
      key: 'edition',
      label: 'Edition',
      options: [
        { value: 'limited', label: 'Limited' },
        { value: 'unlimited', label: 'Unlimited' },
      ],
    },
    {
      key: 'size',
      label: 'Size',
      options: [
        { value: 'major', label: 'Major (>100 cards)' },
        { value: 'minor', label: 'Minor (≤100 cards)' },
      ],
    },
  ], []);

  // Filter sets based on active filters
  const filteredSets = useMemo(() => {
    let filtered = [...sets];

    // Apply edition filter
    if (activeFilters.edition.length > 0) {
      filtered = filtered.filter((set) => {
        const isLimited = set.id.endsWith('-limited');
        const isUnlimited = set.id.endsWith('-unlimited');
        return activeFilters.edition.some((filter) =>
          filter === 'limited' ? isLimited : isUnlimited
        );
      });
    }

    // Apply size filter
    if (activeFilters.size.length > 0) {
      filtered = filtered.filter((set) => {
        const stats = setStats[set.id];
        if (!stats) return true; // Include if stats not loaded yet
        const totalCards = stats.total.total;
        const isMajor = totalCards > 100;
        return activeFilters.size.some((filter) =>
          filter === 'major' ? isMajor : !isMajor
        );
      });
    }

    return filtered;
  }, [sets, activeFilters, setStats]);

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
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    setCard: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    setHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    setIcon: {
      width: 24,
      height: 24,
      marginRight: 12,
    },
    setName: {
      fontSize: 20,
      fontFamily: 'ZenDots_400Regular',
      color: colors.fg,
      flex: 1,
    },
    setDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    setAbbr: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.accent,
    },
    setDate: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    progressSection: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Collection</Text>
            <Text style={styles.subtitle}>Select a Set</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Collection</Text>
          <Text style={styles.subtitle}>Select a Set</Text>
        </View>

        <FilterBar
          categories={filterCategories}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredSets.map((set) => {
            const stats = setStats[set.id];
            return (
              <TouchableOpacity
                key={set.id}
                style={styles.setCard}
                onPress={() => handleSetPress(set)}
                activeOpacity={0.7}
              >
                <View style={styles.setHeader}>
                  <Image
                    source={getSetIcon(set.icon_path)}
                    style={styles.setIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.setName}>{set.name}</Text>
                </View>
                <View style={styles.setDetails}>
                  {set.abbreviation && (
                    <Text style={styles.setAbbr}>{set.abbreviation}</Text>
                  )}
                  {set.release_date && (
                    <Text style={styles.setDate}>
                      {new Date(set.release_date).getFullYear()}
                    </Text>
                  )}
                </View>

                {stats && (
                  <View style={styles.progressSection}>
                    <ProgressBar
                      label="Total"
                      owned={stats.total.owned}
                      total={stats.total.total}
                      color={colors.accent}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
