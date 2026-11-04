import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import i18n from '@/i18n';

/**
 * What the user sees when the whole app tree throws.
 *
 * This renders in place of the root layout, so none of the app's providers are
 * mounted. It must not touch `useApp`, `useTheme` or anything else that reads
 * context — those are exactly what may have just failed. Colours come straight
 * from the theme constants and strings straight from the i18n instance, with
 * English defaults in case translations are what broke.
 */
export function AppErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  // Single place to forward to a crash reporter once one is wired up. In an effect, not
  // the render body: this component re-renders on theme and language changes, and a
  // side effect in render would report the same crash again each time.
  useEffect(() => {
    console.error('[AppErrorScreen]', error);
  }, [error]);

  const tr = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback });

  const confirmReset = () => {
    const title = tr('errorScreen.resetTitle', 'Delete app data?');
    const message = tr(
      'errorScreen.resetMessage',
      'This removes your listings, coins and settings from this phone and starts fresh.'
    );
    const cancel = tr('common.cancel', 'Cancel');
    const confirm = tr('errorScreen.resetConfirm', 'Delete and restart');

    const reset = async () => {
      try {
        await AsyncStorage.clear();
      } catch (clearError) {
        console.error('[AppErrorScreen] clear failed', clearError);
      }
      retry();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) {
        void reset();
      }
      return;
    }
    Alert.alert(title, message, [
      { text: cancel, style: 'cancel' },
      { text: confirm, style: 'destructive', onPress: () => void reset() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.emoji]} accessible={false}>
        🛠️
      </Text>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
        {tr('errorScreen.title', 'Something went wrong')}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {tr('errorScreen.body', 'The app hit an error. Trying again usually fixes it.')}
      </Text>

      {__DEV__ && (
        <Text style={[styles.detail, { color: colors.textSecondary, backgroundColor: colors.backgroundElement }]}>
          {error.message}
        </Text>
      )}

      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.text },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={[styles.primaryLabel, { color: colors.background }]}>
          {tr('errorScreen.retry', 'Try again')}
        </Text>
      </Pressable>

      {/* Escape hatch for a crash caused by bad saved data, which retrying alone never clears. */}
      <Pressable onPress={confirmReset} accessibilityRole="button" style={styles.secondary}>
        <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
          {tr('errorScreen.reset', 'Delete app data and restart')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: Spacing.four,
  },
  detail: {
    fontSize: 12,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
    maxWidth: 340,
  },
  primary: {
    minWidth: 200,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    marginTop: Spacing.four,
    padding: Spacing.two,
  },
  secondaryLabel: {
    fontSize: 14,
  },
});
