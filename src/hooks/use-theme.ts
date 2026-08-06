import { Colors } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useColorScheme } from 'react-native';

export function useTheme() {
  const systemScheme = useColorScheme();
  const { appTheme } = useApp();
  const isDark = appTheme === 'dark' || (appTheme === 'system' && systemScheme === 'dark');
  return Colors[isDark ? 'dark' : 'light'];
}
