import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GamificationModal } from '@/components/GamificationModal';
import { ListingPreview } from '@/components/ListingPreview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ListingCategory, ListingType, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';
import { formatCoins } from '@/utils/coins';

export default function MarketplaceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { listings, walletBalance, appLanguage, setAppLanguage } = useApp();

  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [gamificationVisible, setGamificationVisible] = useState(false);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('hasSeenGamification');
        if (!hasSeen) {
          setGamificationVisible(true);
          await AsyncStorage.setItem('hasSeenGamification', 'true');
        }
      } catch (e) {}
    };
    checkFirstLaunch();
  }, []);
  const LANGUAGES = [
    { code: 'sk', label: 'SK', flag: '🇸🇰' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'pl', label: 'PL', flag: '🇵🇱' },
    { code: 'hu', label: 'HU', flag: '🇭🇺' },
    { code: 'uk', label: 'UK', flag: '🇺🇦' },
    { code: 'de', label: 'DE', flag: '🇩🇪' },
  ];
  const currentLang = LANGUAGES.find(l => l.code === appLanguage) || LANGUAGES[0];

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ListingType>('supply');
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const onboardingSteps = [
    {
      titleKey: 'marketplace.onboardingStep1Title',
      textKey: 'marketplace.onboardingStep1Text',
      icon: 'sparkles',
      fallbackIcon: 'auto_awesome',
    },
    {
      titleKey: 'marketplace.onboardingStep2Title',
      textKey: 'marketplace.onboardingStep2Text',
      icon: 'plus.circle.fill',
      fallbackIcon: 'add_circle',
    },
    {
      titleKey: 'marketplace.onboardingStep3Title',
      textKey: 'marketplace.onboardingStep3Text',
      icon: 'shield.fill',
      fallbackIcon: 'security',
    },
  ] as const;

  const CATEGORIES: { labelKey: string; value: ListingCategory | 'all'; icon: string; fallbackIcon: string; color: string }[] = [
    { labelKey: 'common.all', value: 'all', icon: 'square.grid.2x2.fill', fallbackIcon: 'apps', color: '#333333' },
    { labelKey: 'common.anything', value: 'anything', icon: 'square.grid.2x2', fallbackIcon: 'apps', color: '#6c5ce7' },
    { labelKey: 'common.clothing', value: 'clothing', icon: 'tshirt', fallbackIcon: 'checkroom', color: '#ff7675' },
    { labelKey: 'common.material', value: 'material', icon: 'shippingbox', fallbackIcon: 'inventory_2', color: '#fdcb6e' },
    { labelKey: 'common.kids', value: 'kids', icon: 'face.smiling.fill', fallbackIcon: 'face', color: '#00b894' },
    { labelKey: 'common.men', value: 'men', icon: 'bolt.fill', fallbackIcon: 'bolt', color: '#0984e3' },
    { labelKey: 'common.women', value: 'women', icon: 'heart.fill', fallbackIcon: 'favorite', color: '#e84393' },
    { labelKey: 'common.service', value: 'service', icon: 'wrench.and.screwdriver', fallbackIcon: 'build', color: '#8338EC' },
    { labelKey: 'common.meeting', value: 'meeting', icon: 'person.2', fallbackIcon: 'people', color: '#38B000' },
    { labelKey: 'common.tickets', value: 'tickets', icon: 'ticket', fallbackIcon: 'local_activity', color: '#FF006E' },
    { labelKey: 'common.electronics', value: 'electronics', icon: 'desktopcomputer', fallbackIcon: 'devices', color: '#2d3436' },
    { labelKey: 'common.home', value: 'home', icon: 'house', fallbackIcon: 'home', color: '#d63031' },
    { labelKey: 'common.pets', value: 'pets', icon: 'pawprint', fallbackIcon: 'pets', color: '#e17055' },
    { labelKey: 'common.sport', value: 'sport', icon: 'figure.run', fallbackIcon: 'sports_soccer', color: '#3A86F0' },
    { labelKey: 'common.auto', value: 'auto', icon: 'car', fallbackIcon: 'directions_car', color: '#b2bec3' },
  ];

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
        const hasSeenGamification = await AsyncStorage.getItem('hasSeenGamification');

        if (!hasSeen) {
          setOnboardingVisible(true);
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
        }

        if (!hasSeenGamification) {
          setGamificationVisible(true);
          await AsyncStorage.setItem('hasSeenGamification', 'true');
        }
      } catch {
        console.warn('Initial startup state check failed');
      }
    };

    void checkFirstLaunch();
    const timer = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Filter listings based on search, category, type, and expiration
  const filteredListings = listings.filter((item) => {
    // Hide expired listings from main feed
    const isExpired = new Date(item.expiresAt).getTime() < nowTs;
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
        <View style={styles.header}>
          {/* The brand block gives up width first — the subtitle is far longer in
              German and Polish and would otherwise push the wallet off screen. */}
          <View style={styles.headerBrand}>
            <Pressable onPress={() => setLangMenuVisible(true)} style={styles.langFlagBtn}>
              <ThemedText style={{ fontSize: 24, marginRight: Spacing.three }}>{currentLang.flag}</ThemedText>
            </Pressable>
            <View style={{ flexShrink: 1 }}>
              <ThemedText type="title" style={styles.brandTitle}>{t('common.brand')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {t('common.subtitle')}
              </ThemedText>
            </View>
          </View>

          <Pressable
            onPress={() => router.push('/wallet')}
            style={({ pressed }) => [
              styles.walletBadge,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor="#FFD43B"
              name={{ ios: 'creditcard.circle.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
              size={16}
            />
            <ThemedText type="smallBold" style={styles.walletBalanceText}>
              {formatCoins(walletBalance)}
            </ThemedText>
          </Pressable>
        </View>

        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // The filters scroll away with the list, so listings get the full screen
          // instead of the sliver that was left over between fixed blocks.
          ListHeaderComponent={
            <>
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

            <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundElement }]}>
              <Pressable
                onPress={() => setSelectedType('supply')}
                style={[
                  styles.toggleButton,
                  selectedType === 'supply' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }],
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
                  selectedType === 'demand' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }],
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

            <View style={styles.categoriesContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <ThemedText type="smallBold" themeColor="textSecondary">{t('marketplace.categoriesLabel')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ opacity: 0.6, fontSize: 11 }}>
                  {t('marketplace.swipeHint')}
                </ThemedText>
              </View>
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
                          backgroundColor: isSelected ? item.color : item.color + '15',
                          borderColor: isSelected ? item.color : 'transparent',
                        },
                      ]}
                    >
                      <SymbolView
                        tintColor={isSelected ? '#ffffff' : item.color}
                        name={{ ios: item.icon as any, android: item.fallbackIcon as any, web: item.fallbackIcon as any }}
                        size={20}
                        style={styles.chipIcon}
                      />
                      <ThemedText type="smallBold" style={{ color: isSelected ? '#ffffff' : item.color, marginLeft: Spacing.one }}>
                        {t(item.labelKey)}
                      </ThemedText>
                    </Pressable>
                  );
                }}
              />
            </View>
            </>
          }
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
          renderItem={({ item }) => <ListingPreview listing={item} />}
        />
      </SafeAreaView>

      <Modal
        visible={langMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setLangMenuVisible(false)}>
          <View style={[styles.langModalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            {LANGUAGES.map(lang => (
              <Pressable
                key={lang.code}
                style={[
                  styles.langModalItem,
                  appLanguage === lang.code && { backgroundColor: theme.backgroundSelected },
                ]}
                onPress={() => {
                  setAppLanguage(lang.code);
                  setLangMenuVisible(false);
                }}
              >
                <ThemedText style={{ fontSize: 20 }}>{lang.flag}</ThemedText>
                <ThemedText type="smallBold" style={{ marginLeft: Spacing.three }}>{lang.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={onboardingVisible} transparent animationType="slide" onRequestClose={() => setOnboardingVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOnboardingVisible(false)}>
          <View style={[styles.onboardingCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <View style={styles.onboardingHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">{t('marketplace.onboardingTitle')}</ThemedText>
              <Pressable onPress={() => setOnboardingVisible(false)}>
                <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }} size={20} />
              </Pressable>
            </View>

            <View style={styles.onboardingIconContainer}>
              <SymbolView
                tintColor="#6c5ce7"
                name={{
                  ios: onboardingSteps[onboardingStep].icon as any,
                  android: onboardingSteps[onboardingStep].fallbackIcon as any,
                  web: onboardingSteps[onboardingStep].fallbackIcon as any,
                }}
                size={32}
              />
            </View>

            <ThemedText type="subtitle" style={styles.onboardingTitleText}>
              {t(onboardingSteps[onboardingStep].titleKey)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.onboardingText}>
              {t(onboardingSteps[onboardingStep].textKey)}
            </ThemedText>

            <View style={styles.stepDots}>
              {onboardingSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    { backgroundColor: index === onboardingStep ? '#6c5ce7' : theme.backgroundSelected },
                  ]}
                />
              ))}
            </View>

            <View style={styles.onboardingActions}>
              {onboardingStep > 0 && (
                <Pressable onPress={() => setOnboardingStep((current) => Math.max(0, current - 1))} style={[styles.secondaryAction, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">{t('common.cancel')}</ThemedText>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  if (onboardingStep === onboardingSteps.length - 1) {
                    setOnboardingVisible(false);
                    setOnboardingStep(0);
                    return;
                  }
                  setOnboardingStep((current) => current + 1);
                }}
                style={[styles.primaryAction, { backgroundColor: '#6c5ce7' }]}
              >
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  {onboardingStep === onboardingSteps.length - 1 ? t('common.confirm') : t('marketplace.nextStep')}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <GamificationModal visible={gamificationVisible} onClose={() => setGamificationVisible(false)} />
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
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: Spacing.two,
  },
  brandTitle: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
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
    borderRadius: Spacing.four,
    borderWidth: 1,
    minHeight: 44,
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
    maxWidth: 250,
  },
  langFlagBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  langModalContent: {
    width: 250,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
  },
  langModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  onboardingCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    padding: Spacing.four,
  },
  onboardingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  onboardingIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  onboardingTitleText: {
    marginBottom: Spacing.two,
  },
  onboardingText: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  onboardingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  secondaryAction: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  primaryAction: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
});
