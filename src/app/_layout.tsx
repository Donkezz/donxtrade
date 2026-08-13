import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
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
      {/*
        A Stack wraps the tabs so screens outside the tab bar can be pushed over
        it. The tabs themselves live in the (tabs) group, which is a grouping
        folder only — it does not change any route's URL.
      */}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[id]" options={{ headerShown: true }} />
      </Stack>
      <LoginModal />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <InnerLayout />
    </AppProvider>
  );
}
