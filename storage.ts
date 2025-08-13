import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecentSearch = {
  id: string;
  title: string;
  subtitle?: string;
  timestamp: number;
  thumbnailUri?: string | null;
};

function makeId() {
  // simple, dependency-free id: timestamp + random hex
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`;
}

export async function readRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem('@recent_searches');
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearch[];
  } catch (e) {
    console.warn('Failed to read recent searches', e);
    return [];
  }
}

export async function saveRecentSearch(item: Omit<RecentSearch, 'id' | 'timestamp'>) {
  try {
    const current = await readRecentSearches();
    const entry: RecentSearch = {
      id: makeId(),
      title: item.title,
      subtitle: item.subtitle,
      thumbnailUri: item.thumbnailUri ?? null,
      timestamp: Date.now(),
    };
    const next = [entry, ...current].slice(0, 20);
    await AsyncStorage.setItem('@recent_searches', JSON.stringify(next));
    return entry;
  } catch (e) {
    console.warn('Failed to save recent search', e);
    return null;
  }
}
