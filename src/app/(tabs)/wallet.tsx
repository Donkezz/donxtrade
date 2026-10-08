import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Platform, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrency } from '@/hooks/use-currency';
import { formatCoins } from '@/utils/coins';
import { useApp, Listing, Transaction } from '@/context/AppContext';
import { SecureChatModal } from '@/components/SecureChatModal';
import { GamificationModal } from '@/components/GamificationModal';

const LANGUAGES = [
  { code: 'sk', label: 'SK', flag: '🇸🇰' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'pl', label: 'PL', flag: '🇵🇱' },
  { code: 'hu', label: 'HU', flag: '🇭🇺' },
  { code: 'uk', label: 'UK', flag: '🇺🇦' },
];

const THEMES = [
  { value: 'light', labelKey: 'profile.themeLight', icon: 'sun.max.fill', fallbackIcon: 'light_mode' },
  { value: 'dark', labelKey: 'profile.themeDark', icon: 'moon.fill', fallbackIcon: 'dark_mode' },
  { value: 'system', labelKey: 'profile.themeSystem', icon: 'laptopcomputer', fallbackIcon: 'settings_suggest' },
];

const MyListingItem = ({
  listing,
  onDelete,
  onBoost,
  onResolve,
}: {
  listing: Listing;
  onDelete: () => void;
  onBoost: () => void;
  onResolve: () => void;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { format: formatPrice } = useCurrency();
  const [timeLeft, setTimeLeft] = useState('');
  // Kept in state, not read during render, and refreshed by the same timer as the countdown.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const calc = () => {
      setNow(Date.now());
      const diff = new Date(listing.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(t('listingCard.expired'));
        return;
      }
      const totalMin = Math.floor(diff / 60000);
      const days = Math.floor(totalMin / 1440);
      const hours = Math.floor((totalMin % 1440) / 60);
      const mins = totalMin % 60;
      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}min`);
      else setTimeLeft(`${mins}min`);
    };
    calc();
    const inv = setInterval(calc, 30000);
    return () => clearInterval(inv);
  }, [listing.expiresAt, t]);

  const boosted = !!listing.boostedUntil && new Date(listing.boostedUntil).getTime() > now;
  const boostedTime = boosted
    ? new Date(listing.boostedUntil as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={[styles.myListingCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
      <View style={styles.myListingTop}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {listing.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {listing.price === 0 ? t('common.free') : formatPrice(listing.price)} • {timeLeft}
          </ThemedText>
        </View>
        <Pressable
          onPress={onDelete}
          style={styles.deleteListingBtn}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.deleteListing')}
        >
          <SymbolView tintColor="#ff6b6b" name={{ ios: 'trash.fill', android: 'delete', web: 'delete' }} size={16} />
        </Pressable>
      </View>

      <View style={styles.myListingActions}>
        {boosted ? (
          <View style={[styles.actionChip, { backgroundColor: '#FFB70333', borderColor: '#FFB703' }]}>
            <ThemedText type="smallBold">{t('profile.boostedUntil', { time: boostedTime })}</ThemedText>
          </View>
        ) : (
          <Pressable
            onPress={onBoost}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.actionChip,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected },
              pressed && { opacity: 0.7 },
            ]}
          >
            <ThemedText type="smallBold">{t('profile.boostBtn')}</ThemedText>
          </Pressable>
        )}

        <Pressable
          onPress={onResolve}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionChip,
            { backgroundColor: 'transparent', borderColor: theme.backgroundSelected },
            pressed && { opacity: 0.7 },
          ]}
        >
          <ThemedText type="smallBold">{t('profile.resolveBtn')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
};


export default function WalletScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { 
    walletBalance, 
    resetAllData, 
    listings, 
    unlockedListings, 
    chats,
    deleteListing,
    boostListing,
    resolveListing,
    appLanguage,
    setAppLanguage,
    appTheme,
    setAppTheme,
    currentUser,
    setLoginVisible,
    logout,
    transactions
  } = useApp();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [gamificationVisible, setGamificationVisible] = useState(false);



  const unlockedItems = listings.filter((item) => unlockedListings.includes(item.id));
  // Demo listings are never the user's own, and resolved ones have left the board.
  const myItems = listings.filter((item) => item.isMine === true && !item.isDemo && !item.resolvedAt);
  const earnedCredits = transactions
    .filter((tx) => tx.amount > 0 && (tx.type === 'bonus' || tx.type === 'create' || tx.type === 'resolve'))
    .reduce((acc, tx) => acc + tx.amount, 0);

  const handleReset = () => {
    const confirmMessage = t('profile.resetConfirm');
    
    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm(confirmMessage);
      if (confirmWeb) {
        resetAllData();
      }
    } else {
      Alert.alert(
        t('profile.resetBtn'),
        confirmMessage,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.resetBtn'), style: 'destructive', onPress: resetAllData }
        ]
      );
    }
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmAction = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
    destructive = false
  ) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) onConfirm();
      return;
    }
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
  };

  const handleDeleteListing = (id: string) =>
    confirmAction(
      t('profile.deleteConfirmTitle'),
      t('profile.deleteConfirmBody'),
      t('profile.deleteBtn'),
      () => deleteListing(id),
      true
    );

  const handleBoost = (id: string) =>
    confirmAction(t('profile.boostBtn'), t('profile.boostConfirm'), t('profile.boostBtn'), async () => {
      const result = await boostListing(id);
      if (result === 'no-coins') {
        notify(t('listingCard.insufficientFundsTitle'), t('profile.boostNoCoins'));
      } else if (result === 'ok') {
        notify(t('common.success'), t('profile.boostDone'));
      }
    });

  const handleResolve = (id: string) =>
    confirmAction(t('profile.resolveBtn'), t('profile.resolveConfirm'), t('profile.resolveBtn'), async () => {
      const result = await resolveListing(id);
      if (result.ok) {
        notify(t('common.success'), result.rewarded ? t('profile.resolveRewarded') : t('profile.resolveNoReward'));
      }
    });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BottomTabInset + Spacing.five }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <ThemedText type="title">{t('profile.profileTitle')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('profile.profileSubtitle')}
                </ThemedText>
              </View>
            </View>
          </View>

          {currentUser && (
            <View style={{ alignItems: 'flex-end', marginBottom: Spacing.four }}>
              <ThemedText type="smallBold" themeColor="textSecondary">{t('auth.loggedInAs', { name: currentUser.name })}</ThemedText>
              <Pressable onPress={logout} style={{ marginTop: Spacing.one }}>
                <ThemedText type="smallBold" style={{ color: '#ff6b6b' }}>{t('profile.logout')}</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Gamification Dashboard */}
          <View style={[styles.dashboardCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <View style={styles.dashboardHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary">{t('profile.balanceLabel')}</ThemedText>
              <ThemedText type="subtitle" style={{ fontSize: 32, marginTop: Spacing.one }}>{formatCoins(walletBalance)}</ThemedText>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel} numberOfLines={2}>{t('profile.statEarned')}</ThemedText>
                <ThemedText type="smallBold" style={{ color: '#00b894', marginTop: 2 }}>+{Math.floor(earnedCredits)}</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.statBox}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel} numberOfLines={2}>{t('profile.statUnlocked')}</ThemedText>
                <ThemedText type="smallBold" style={{ marginTop: 2 }}>{unlockedItems.length}</ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
              <View style={styles.statBox}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel} numberOfLines={2}>{t('profile.statMyListings')}</ThemedText>
                <ThemedText type="smallBold" style={{ marginTop: 2 }}>{myItems.length}</ThemedText>
              </View>
            </View>
          </View>

          {/* Gamification Banner */}
          <Pressable 
            onPress={() => setGamificationVisible(true)}
            style={({ pressed }) => [
              styles.gamificationBanner,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
              pressed && { opacity: 0.8 }
            ]}
          >
            <View style={styles.bannerIcon}>
              <SymbolView tintColor="#FFD700" name={{ ios: 'star.circle.fill', android: 'star', web: 'star' } as any} size={28} />
            </View>
            <View style={styles.bannerText}>
              <ThemedText type="smallBold">🌟 {t('profile.earnMoreTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>{t('profile.earnMoreSub')}</ThemedText>
            </View>
            <SymbolView tintColor={theme.textSecondary} name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' } as any} size={20} />
          </Pressable>

          {/* Settings Section (Theme) */}
          <View style={[styles.sectionWrapper, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" style={styles.sectionHeader}>{t('profile.settingsSection')}</ThemedText>

            {/* Theme Selection */}
            <View style={styles.settingsGroup}>
              <ThemedText type="smallBold" style={styles.settingsLabel}>{t('profile.themeLabel')}</ThemedText>
              <View style={styles.themeGrid}>
                {THEMES.map((themeItem) => {
                  const isSelected = appTheme === themeItem.value;
                  return (
                    <Pressable
                      key={themeItem.value}
                      onPress={() => setAppTheme(themeItem.value as any)}
                      style={[
                        styles.themeChip,
                        { 
                          backgroundColor: isSelected ? theme.text : theme.backgroundSelected,
                        }
                      ]}
                    >
                      <SymbolView
                        tintColor={isSelected ? theme.background : theme.text}
                        name={{ ios: themeItem.icon as any, android: themeItem.fallbackIcon as any, web: themeItem.fallbackIcon as any }}
                        size={12}
                        style={{ marginRight: 4 }}
                      />
                      <ThemedText type="small" style={{ color: isSelected ? theme.background : theme.text }}>
                        {t(themeItem.labelKey)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {!currentUser ? (
            <View style={[styles.loginPrompt, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <SymbolView tintColor={theme.text} name={{ ios: 'lock.circle.fill', android: 'lock', web: 'lock' } as any} size={48} />
              <ThemedText type="subtitle" style={{ marginTop: Spacing.three, textAlign: 'center' }}>
                {t('auth.loginRequiredTitle')}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.one, marginBottom: Spacing.four }}>
                {t('auth.loginRequiredWallet')}
              </ThemedText>
              <Pressable
                onPress={() => setLoginVisible(true)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.text },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.background }}>{t('profile.login')}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
          {/* Action Buttons */}
          <View style={[styles.buttonRow, { marginTop: Spacing.four }]}>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                styles.resetButton,
                { borderColor: '#ff6b6b', flex: 1, borderWidth: 1 },
                pressed && { backgroundColor: '#ff6b6b20' }
              ]}
            >
              <SymbolView
                tintColor="#ff6b6b"
                name={{ ios: 'arrow.counterclockwise.circle.fill', android: 'refresh', web: 'refresh' }}
                size={16}
              />
              <ThemedText type="smallBold" style={{ color: '#ff6b6b', marginLeft: Spacing.one }}>
                {t('profile.resetData')}
              </ThemedText>
            </Pressable>
          </View>

          {currentUser?.role === 'admin' && (
          <Pressable
            onPress={() => router.push('/admin')}
            style={({ pressed }) => [
              styles.adminButton,
              { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, marginTop: Spacing.four },
              pressed && { opacity: 0.8 }
            ]}
          >
            <SymbolView
              tintColor={theme.text}
              name={{ ios: 'chart.pie.fill', android: 'analytics', web: 'analytics' } as any}
              size={18}
            />
            <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>
              {t('profile.adminDashboardBtn')}
            </ThemedText>
          </Pressable>
          )}

          {/* Your own listings: boost, mark as handled, delete */}
          <View style={[styles.unlockedSection, { marginTop: Spacing.four }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {t('profile.myListingsSection').replace('%s', String(myItems.length))}
            </ThemedText>

            {myItems.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{ ios: 'tray.fill', android: 'inbox', web: 'inbox' }}
                  size={24}
                />
                <ThemedText type="smallBold" style={styles.emptyTitle}>
                  {t('profile.noListings')}
                </ThemedText>
              </View>
            ) : (
              <View style={{ gap: Spacing.two }}>
                {myItems.map((item) => (
                  <MyListingItem
                    key={item.id}
                    listing={item}
                    onDelete={() => handleDeleteListing(item.id)}
                    onBoost={() => handleBoost(item.id)}
                    onResolve={() => handleResolve(item.id)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Contacts you have unlocked */}
          <View style={[styles.unlockedSection, { marginTop: Spacing.four }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {t('profile.unlockedContactsSection').replace('%s', String(unlockedItems.length))}
            </ThemedText>

            {unlockedItems.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                  size={24}
                />
                <ThemedText type="smallBold" style={styles.emptyTitle}>
                  {t('profile.noUnlockedContacts')}
                </ThemedText>
              </View>
            ) : (
              unlockedItems.map((item) => (
                <View 
                  key={item.id} 
                  style={[
                    styles.unlockedCard, 
                    { 
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected
                    }
                  ]}
                >
                  <View style={styles.unlockedCardHeader}>
                    <ThemedText type="smallBold" style={styles.unlockedItemTitle}>
                      {item.title}
                    </ThemedText>
                    <ValuesRow price={item.price} originalPrice={item.originalPrice} />
                  </View>
                  
                  <ThemedText type="small" themeColor="textSecondary" style={styles.unlockedLocation}>
                    📍 {item.location}
                  </ThemedText>

                  <View style={[styles.contactBox, { backgroundColor: theme.backgroundSelected }]}>
                    <View style={styles.contactField}>
                      <ThemedText type="small" themeColor="textSecondary">{t('chat.unlockedInfoName')}:</ThemedText>
                      <ThemedText type="smallBold" style={styles.contactVal}>
                        {item.isAnonymous ? t('profile.anonymousUser') : item.ownerName}
                      </ThemedText>
                    </View>
                    <View style={styles.contactField}>
                      <ThemedText type="small" themeColor="textSecondary">{t('chat.unlockedInfoVal')}:</ThemedText>
                      <ThemedText type="code" style={[styles.contactVal, { color: theme.text }]} selectable>
                        {item.contactInfo}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Active Chats Section */}
          <View style={[styles.unlockedSection, { marginTop: Spacing.four }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {t('profile.activeChatsSection').replace('%s', String(chats.length))}
            </ThemedText>

            {chats.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{ ios: 'message.fill' as any, android: 'chat' as any, web: 'chat' as any }}
                  size={24}
                />
                <ThemedText type="smallBold" style={styles.emptyTitle}>
                  {t('profile.noActiveChats')}
                </ThemedText>
              </View>
            ) : (
              chats.map((chat) => {
                const lastMsg = chat.messages[chat.messages.length - 1];
                return (
                  <Pressable
                    key={chat.listingId}
                    onPress={() => setActiveChatId(chat.listingId)}
                    style={({ pressed }) => [
                      styles.unlockedCard,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected
                      },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <View style={styles.unlockedCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={styles.onlineDot} />
                        <ThemedText type="smallBold" style={styles.unlockedItemTitle}>
                          {chat.participantName}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {lastMsg ? lastMsg.timestamp : ''}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={{ marginTop: Spacing.half }}>
                      {chat.listingTitle}
                    </ThemedText>
                    <View style={[styles.contactBox, { backgroundColor: theme.backgroundSelected, marginTop: Spacing.two }]}>
                      <ThemedText type="small" numberOfLines={1} style={{ fontStyle: 'italic' }}>
                        {lastMsg ? `${lastMsg.sender === 'me' ? t('profile.meLabel') : t('profile.sellerLabel')}: ${lastMsg.mediaUri ? (lastMsg.mediaType === 'image' ? t('chat.imageAttachment') : t('chat.videoAttachment')) : lastMsg.text}` : t('profile.noMessages')}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
          </>
          )}

        </ScrollView>
      </SafeAreaView>
      {activeChatId && (
        <SecureChatModal
          visible={activeChatId !== null}
          listingId={activeChatId}
          onClose={() => setActiveChatId(null)}
        />
      )}
      <GamificationModal visible={gamificationVisible} onClose={() => setGamificationVisible(false)} />

      {/* Language Modal */}
      <Modal visible={langMenuVisible} transparent animationType="fade" onRequestClose={() => setLangMenuVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setLangMenuVisible(false)}>
          <View style={[styles.langModalContent, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.three }}>{t('profile.languageLabel')}</ThemedText>
            {LANGUAGES.map((lang) => {
              const isSelected = appLanguage === lang.code;
              return (
                <Pressable
                  key={lang.code}
                  onPress={() => {
                    setAppLanguage(lang.code);
                    setLangMenuVisible(false);
                  }}
                  style={[
                    styles.langModalItem,
                    isSelected && { backgroundColor: theme.backgroundSelected }
                  ]}
                >
                  <ThemedText style={{ fontSize: 16 }}>{lang.flag} {lang.label}</ThemedText>
                  {isSelected && <SymbolView tintColor={theme.text} name={{ ios: 'checkmark', web: 'check', android: 'check' } as any} size={16} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const ValuesRow = ({ price, originalPrice }: { price: number; originalPrice?: number }) => {
  const { t } = useTranslation();
  const { format: formatPrice } = useCurrency();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <ThemedText type="smallBold" style={styles.unlockedItemPrice}>
        {price === 0 ? t('common.free') : formatPrice(price)}
      </ThemedText>
      {originalPrice && (
        <ThemedText type="small" style={styles.origPriceText}>
          {formatPrice(originalPrice)}
        </ThemedText>
      )}
    </View>
  );
};

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
  scrollContent: {
    paddingVertical: Spacing.three,
  },
  header: {
    marginBottom: Spacing.four,
    marginTop: Spacing.two,
  },
  sectionWrapper: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    fontSize: 14,
    marginBottom: Spacing.three,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsGroup: {
    width: '100%',
  },
  settingsLabel: {
    fontSize: 14,
    marginBottom: Spacing.two,
  },
  langFlagBtn: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  walletCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    height: 180,
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  gamificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  bannerIcon: {
    marginRight: Spacing.three,
  },
  bannerText: {
    flex: 1,
  },
  dashboardCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  dashboardHeader: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: 'bold',
    letterSpacing: 2,
    fontSize: 14,
  },
  demoBadge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  demoBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardBody: {
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 40,
    marginTop: Spacing.one,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHolder: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardLogo: {
    flexDirection: 'row',
  },
  cardCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.9,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38B00015',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  topUpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.five,
  },
  unlockedSection: {
    marginTop: Spacing.one,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: Spacing.three,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  emptyTitle: {
    marginTop: Spacing.two,
    fontSize: 13,
  },
  unlockedCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  unlockedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.one,
  },
  unlockedItemTitle: {
    fontSize: 14,
    flex: 1,
  },
  unlockedItemPrice: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: Spacing.two,
  },
  origPriceText: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    opacity: 0.5,
    marginLeft: Spacing.one,
  },
  unlockedLocation: {
    fontSize: 11,
    marginBottom: Spacing.two,
  },
  contactBox: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  contactField: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactVal: {
    marginLeft: Spacing.two,
    fontSize: 13,
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
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38B000',
    marginRight: Spacing.two,
  },
  myListingsContainer: {
    gap: Spacing.two,
  },
  myListingCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  myListingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myListingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  deleteListingBtn: {
    padding: Spacing.two,
  },
  transactionsListContainer: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  loginPrompt: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  primaryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    width: '100%',
    alignItems: 'center',
  },
});
