import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useApp } from '@/context/AppContext';

export function useTheme() {
  const systemScheme = useColorScheme();
  try {
    const { appTheme } = useApp();
    const isDark = appTheme === 'dark' || (appTheme === 'system' && systemScheme === 'dark');
    return Colors[isDark ? 'dark' : 'light'];
  } catch {
    const isDark = systemScheme === 'dark';
    return Colors[isDark ? 'dark' : 'light'];
  }
}
