import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ListingCard } from '@/components/ListingCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

/**
 * Full listing. The marketplace list only carries previews, so everything
 * heavy — media gallery, full description, contact unlocking, secure chat —
 * is rendered here.
 */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const { listings, unlockedListings } = useApp();

  const listing = listings.find((item) => item.id === id);

  if (!listing) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.missing}>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{ ios: 'tray.fill', android: 'inbox', web: 'inbox' }}
            size={48}
          />
          <ThemedText type="subtitle" style={styles.missingTitle}>
            {t('marketplace.emptyTitle')}
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: theme.text },
              pressed && { opacity: 0.8 },
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              {t('common.cancel')}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: listing.title,
          headerBackTitle: t('navigation.marketplace'),
        }}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: BottomTabInset + Spacing.five },
        ]}
      >
        <ListingCard listing={listing} isUnlocked={unlockedListings.includes(listing.id)} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  missingTitle: {
    marginTop: Spacing.three,
    marginBottom: Spacing.four,
  },
  backBtn: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
  },
});
