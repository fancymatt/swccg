import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useCollectionStats } from '../contexts/CollectionStatsContext';
import { getAllSets, getSetCompletionStats } from '../services/database';
import { ProgressBar } from '../components/ProgressBar';

interface Set {
  id: string;
  name: string;
  abbreviation?: string;
  release_date?: string;
  icon_path?: string;
  category?: string;
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


  // Base set IDs in chronological order (for sorting within Base Sets category)
  const BASE_SET_ORDER = [
    'premiere-limited',
    'a_new_hope-limited',
    'hoth-limited',
    'dagobah-limited',
    'cloud_city-limited',
    'jabbas_palace-limited',
    'special_edition-limited',
    'endor-limited',
    'death_star_ii-limited',
    'tatooine-limited',
    'coruscant-limited',
    'theed_palace-limited',
  ];

  // Group sets into sections by category
  const sectionedSets = useMemo(() => {
    const grouped: Record<string, Set[]> = {
      'Base Sets': [],
      'Reflections': [],
      'Unlimited Sets': [],
      'Other Sets': [],
    };

    // Group sets by category from database
    sets.forEach((set) => {
      const category = set.category || 'Other Sets';
      if (grouped[category]) {
        grouped[category].push(set);
      } else {
        // If category doesn't exist in our predefined groups, add to Other Sets
        grouped['Other Sets'].push(set);
      }
    });

    // Sort each group
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        // For base sets, use the predefined chronological order
        if (category === 'Base Sets') {
          const indexA = BASE_SET_ORDER.indexOf(a.id);
          const indexB = BASE_SET_ORDER.indexOf(b.id);

          // If both found in order array, sort by that order
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }

          // If one is not in the array, sort by release date as fallback
          const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return dateA - dateB;
        }
        // For all other categories, sort by release date
        const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
        const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
        return dateA - dateB;
      });
    });

    // Convert to section format, only including non-empty sections
    const sections = [
      { title: 'Base Sets', data: grouped['Base Sets'] },
      { title: 'Reflections', data: grouped['Reflections'] },
      { title: 'Unlimited Sets', data: grouped['Unlimited Sets'] },
      { title: 'Other Sets', data: grouped['Other Sets'] },
    ].filter(section => section.data.length > 0);

    return sections;
  }, [sets]);

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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    setCard: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      padding: 20,
      marginHorizontal: 16,
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
    sectionHeader: {
      backgroundColor: colors.widgetBg,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionHeaderText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionListContent: {
      paddingBottom: 16,
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
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Collection</Text>
          <Text style={styles.subtitle}>Select a Set</Text>
        </View>

        <SectionList
          sections={sectionedSets}
          keyExtractor={(item) => item.id}
          renderItem={({ item: set }) => {
            const stats = setStats[set.id];
            return (
              <TouchableOpacity
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
          }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.sectionListContent}
          stickySectionHeadersEnabled={true}
        />
      </View>
    </SafeAreaView>
  );
};
