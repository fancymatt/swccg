import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { SetCompletionStats } from '../services/database';

interface CollectionStatsContextType {
  setStats: Record<string, SetCompletionStats>;
  updateSetStats: (setId: string, stats: SetCompletionStats) => void;
  setAllStats: (stats: Record<string, SetCompletionStats>) => void;
}

const CollectionStatsContext = createContext<CollectionStatsContextType | undefined>(undefined);

export const CollectionStatsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [setStats, setSetStats] = useState<Record<string, SetCompletionStats>>({});

  const updateSetStats = useCallback((setId: string, stats: SetCompletionStats) => {
    setSetStats(prev => ({
      ...prev,
      [setId]: stats
    }));
  }, []);

  const setAllStats = useCallback((stats: Record<string, SetCompletionStats>) => {
    setSetStats(stats);
  }, []);

  return (
    <CollectionStatsContext.Provider value={{ setStats, updateSetStats, setAllStats }}>
      {children}
    </CollectionStatsContext.Provider>
  );
};

export const useCollectionStats = () => {
  const context = useContext(CollectionStatsContext);
  if (context === undefined) {
    throw new Error('useCollectionStats must be used within a CollectionStatsProvider');
  }
  return context;
};
