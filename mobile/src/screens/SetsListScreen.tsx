import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { getAllSets } from '../services/database';

interface Set {
  id: string;
  name: string;
  abbreviation?: string;
  release_date?: string;
}

interface SetsListScreenProps {
  navigation: any;
}

export const SetsListScreen: React.FC<SetsListScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [sets, setSets] = useState<Set[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSets();
  }, []);

  const loadSets = async () => {
    try {
      const setsData = await getAllSets();
      setSets(setsData as Set[]);
    } catch (error) {
      console.error('Failed to load sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPress = (set: Set) => {
    navigation.navigate('SetCards', { setId: set.id, setName: set.name });
  };

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
    setName: {
      fontSize: 20,
      fontFamily: 'ZenDots_400Regular',
      color: colors.fg,
      marginBottom: 4,
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {sets.map((set) => (
            <TouchableOpacity
              key={set.id}
              style={styles.setCard}
              onPress={() => handleSetPress(set)}
              activeOpacity={0.7}
            >
              <Text style={styles.setName}>{set.name}</Text>
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
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
