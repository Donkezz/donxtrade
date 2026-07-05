import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AppProvider, useApp } from '@/context/AppContext';
import { LoginModal } from '@/components/LoginModal';

// To force i18n load during rendering
import '@/i18n';

function InnerLayout() {
  const systemColorScheme = useColorScheme();
  const { appTheme } = useApp();

  const isDark = 
    appTheme === 'dark' || 
    (appTheme === 'system' && systemColorScheme === 'dark');

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
      <LoginModal />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <AppProvider>
      <InnerLayout />
    </AppProvider>
  );
}
