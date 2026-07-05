import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ListingCard } from '@/components/ListingCard';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, ListingCategory, ListingType } from '@/context/AppContext';

export default function MarketplaceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { listings, unlockedListings, walletBalance } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ListingType>('supply'); // default: Ponuky

  const CATEGORIES: { labelKey: string; value: ListingCategory | 'all'; icon: string; fallbackIcon: string }[] = [
    { labelKey: 'common.all', value: 'all', icon: 'square.grid.2x2', fallbackIcon: 'apps' },
    { labelKey: 'common.ski_pass', value: 'ski_pass', icon: 'figure.skiing.downhill', fallbackIcon: 'ticket' },
    { labelKey: 'common.ticket', value: 'ticket', icon: 'ticket', fallbackIcon: 'tag' },
    { labelKey: 'common.service', value: 'service', icon: 'wrench.and.screwdriver', fallbackIcon: 'build' },
    { labelKey: 'common.social', value: 'social', icon: 'person.2', fallbackIcon: 'people' },
  ];

  // Filter listings based on search, category, type, and expiration
  const filteredListings = listings.filter((item) => {
    // Hide expired listings from main feed
    const isExpired = new Date(item.expiresAt).getTime() < Date.now();
    if (isExpired) return false;

    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = item.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        
        {/* Header: Title & Balance */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.brandTitle}>{t('common.brand')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{t('common.subtitle')}</ThemedText>
          </View>

          <Pressable 
            onPress={() => router.push('/wallet')}
            style={({ pressed }) => [
              styles.walletBadge,
              { 
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected
              },
              pressed && styles.pressed
            ]}
          >
            <SymbolView
              tintColor="#FFD43B"
              name={{ ios: 'creditcard.circle.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
              size={16}
            />
            <ThemedText type="smallBold" style={styles.walletBalanceText}>
              {walletBalance.toFixed(2)} € (Demo)
            </ThemedText>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={16}
          />
          <TextInput
            placeholder={t('marketplace.searchPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <SymbolView
                tintColor={theme.textSecondary}
                name={{ ios: 'xmark.circle.fill', android: 'clear', web: 'clear' }}
                size={16}
              />
            </Pressable>
          )}
        </View>

        {/* Toggle supply/demand */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundElement }]}>
          <Pressable
            onPress={() => setSelectedType('supply')}
            style={[
              styles.toggleButton,
              selectedType === 'supply' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }]
            ]}
          >
            <ThemedText 
              type="smallBold" 
              themeColor={selectedType === 'supply' ? 'text' : 'textSecondary'}
              style={selectedType === 'supply' && styles.activeText}
            >
              {t('common.supply')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setSelectedType('demand')}
            style={[
              styles.toggleButton,
              selectedType === 'demand' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }]
            ]}
          >
            <ThemedText 
              type="smallBold" 
              themeColor={selectedType === 'demand' ? 'text' : 'textSecondary'}
              style={selectedType === 'demand' && styles.activeText}
            >
              {t('common.demand')}
            </ThemedText>
          </Pressable>
        </View>

        {/* Category Scroll Filter */}
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.value;
              return (
                <Pressable
                  onPress={() => setSelectedCategory(item.value)}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: isSelected ? theme.text : theme.backgroundElement,
                      borderColor: theme.backgroundSelected
                    }
                  ]}
                >
                  <SymbolView
                    tintColor={isSelected ? theme.background : theme.text}
                    name={{ ios: item.icon as any, android: item.fallbackIcon as any, web: item.fallbackIcon as any }}
                    size={12}
                    style={styles.chipIcon}
                  />
                  <ThemedText 
                    type="smallBold" 
                    style={{ color: isSelected ? theme.background : theme.text }}
                  >
                    {t(item.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Listings List */}
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent, 
            { paddingBottom: BottomTabInset + Spacing.five }
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <SymbolView
                tintColor={theme.textSecondary}
                name={{ ios: 'tray.fill', android: 'inbox', web: 'inbox' }}
                size={48}
              />
              <ThemedText type="subtitle" style={styles.emptyText}>
                {t('marketplace.emptyTitle')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtext}>
                {t('marketplace.emptySub')}
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <ListingCard 
              listing={item} 
              isUnlocked={unlockedListings.includes(item.id)} 
            />
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  brandTitle: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1,
    gap: Spacing.one,
  },
  walletBalanceText: {
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Platform.OS === 'ios' ? Spacing.two : Spacing.one,
    marginBottom: Spacing.three,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.two,
    fontSize: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.one,
    marginBottom: Spacing.three,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
  toggleActiveButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activeText: {
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: Spacing.three,
  },
  categoriesList: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: Spacing.one,
  },
  listContent: {
    paddingTop: Spacing.one,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.one,
  },
  emptyText: {
    fontWeight: 'bold',
    marginTop: Spacing.two,
  },
  emptySubtext: {
    textAlign: 'center',
  },
});
