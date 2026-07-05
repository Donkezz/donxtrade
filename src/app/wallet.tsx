import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, Listing, Transaction } from '@/context/AppContext';
import { SecureChatModal } from '@/components/SecureChatModal';
import { FortuneWheel } from '@/components/FortuneWheel';

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

const MyListingItem = ({ listing, onDelete }: { listing: Listing; onDelete: () => void }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
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
      else if (hours > 0) setTimeLeft(`${hours}h ${mins}m`);
      else setTimeLeft(`${mins}m`);
    };
    calc();
    const inv = setInterval(calc, 30000);
    return () => clearInterval(inv);
  }, [listing.expiresAt, t]);

  return (
    <View style={[styles.myListingCard, { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }]}>
      <View style={{ flex: 1 }}>
        <ThemedText type="smallBold" numberOfLines={1}>{listing.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {listing.price === 0 ? t('common.free') : `${listing.price.toFixed(2)} €`} • {timeLeft}
        </ThemedText>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteListingBtn}>
        <SymbolView tintColor="#ff6b6b" name={{ ios: 'trash.fill', web: 'delete' }} size={16} />
      </Pressable>
    </View>
  );
};

const TransactionItem = ({ tx }: { tx: Transaction }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  
  const isPositive = tx.amount > 0;
  const isZero = tx.amount === 0;
  
  const dateObj = new Date(tx.timestamp);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
  
  let label = '';
  switch(tx.type) {
    case 'bonus':
      label = t('profile.txBonus');
      break;
    case 'topup':
      label = t('profile.txTopup');
      break;
    case 'unlock':
      label = `${t('profile.txUnlock')}: ${tx.listingTitle || ''}`;
      break;
    case 'create':
      label = `${t('profile.txCreate')}: ${tx.listingTitle || ''}`;
      break;
  }

  return (
    <View style={[styles.txItem, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={{ flex: 1, paddingRight: Spacing.two }}>
        <ThemedText type="smallBold" numberOfLines={1}>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{dateStr} {timeStr}</ThemedText>
      </View>
      <ThemedText type="smallBold" style={{ color: isPositive ? '#38B000' : isZero ? theme.textSecondary : '#ff6b6b' }}>
        {isPositive ? '+' : ''}{tx.amount.toFixed(2)} €
      </ThemedText>
    </View>
  );
};

export default function WalletScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { 
    walletBalance, 
    topUpWallet, 
    resetAllData, 
    listings, 
    unlockedListings, 
    chats,
    transactions,
    deleteListing,
    appLanguage,
    setAppLanguage,
    appTheme,
    setAppTheme
  } = useApp();

  const [successVisible, setSuccessVisible] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Animation values for Top-up button and card
  const cardScale = useSharedValue(1);
  const cardRotate = useSharedValue(0);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: cardScale.value },
        { rotateZ: `${cardRotate.value}deg` }
      ],
    };
  });

  // Filter listings that have been unlocked
  const unlockedItems = listings.filter((item) => unlockedListings.includes(item.id));
  
  // Filter user's own listings
  const myItems = listings.filter((item) => item.isMine === true);

  const handleTopUp = async () => {
    // Trigger animations
    cardScale.value = withSequence(
      withSpring(1.05, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );
    cardRotate.value = withSequence(
      withTiming(-2, { duration: 100 }),
      withTiming(2, { duration: 100 }),
      withTiming(0, { duration: 150 })
    );

    await topUpWallet(5.00);
    setSuccessVisible(true);
    setTimeout(() => {
      setSuccessVisible(false);
    }, 2000);
  };

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

  const handleDeleteListing = (id: string) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('Naozaj zmazať inzerát?');
      if (ok) deleteListing(id);
    } else {
      Alert.alert('Zmazať inzerát', 'Naozaj chcete natrvalo odstrániť tento inzerát?', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.deleteBtn'), style: 'destructive', onPress: () => deleteListing(id) }
      ]);
    }
  };

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
            <ThemedText type="title">{t('profile.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('profile.subtitle')}
            </ThemedText>
          </View>

          {/* Settings Section (Theme & Language) */}
          <View style={[styles.sectionWrapper, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" style={styles.sectionHeader}>{t('profile.settingsSection')}</ThemedText>
            
            {/* Language Selection */}
            <View style={styles.settingsRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{t('profile.languageLabel')}</ThemedText>
              </View>
              <View style={styles.langGrid}>
                {LANGUAGES.map((lang) => {
                  const isSelected = appLanguage === lang.code;
                  return (
                    <Pressable
                      key={lang.code}
                      onPress={() => setAppLanguage(lang.code)}
                      style={[
                        styles.langChip,
                        { 
                          backgroundColor: isSelected ? theme.text : theme.backgroundSelected,
                        }
                      ]}
                    >
                      <ThemedText style={{ fontSize: 13, color: isSelected ? theme.background : theme.text }}>
                        {lang.flag} {lang.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Theme Selection */}
            <View style={[styles.settingsRow, { borderTopWidth: 1, borderTopColor: theme.backgroundSelected, paddingTop: Spacing.three, marginTop: Spacing.three }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{t('profile.themeLabel')}</ThemedText>
              </View>
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

          {/* Premium Card UI */}
          <Animated.View 
            style={[
              styles.walletCard, 
              cardAnimatedStyle,
              { 
                backgroundColor: theme.text,
                shadowColor: theme.text,
              }
            ]}
          >
            <View style={styles.cardHeader}>
              <ThemedText style={[styles.cardTitle, { color: theme.background }]}>
                DONX PAY
              </ThemedText>
              <View style={styles.demoBadge}>
                <ThemedText style={[styles.demoBadgeText, { color: theme.text, backgroundColor: theme.background }]}>
                  {t('common.playMoneyWarning').toUpperCase()}
                </ThemedText>
              </View>
            </View>

            <View style={styles.cardBody}>
              <ThemedText style={[styles.cardLabel, { color: theme.background + 'B0' }]}>
                {t('profile.demoBalanceLabel')}
              </ThemedText>
              <ThemedText style={[styles.cardBalance, { color: theme.background }]}>
                {walletBalance.toFixed(2)} €
              </ThemedText>
            </View>

            <View style={styles.cardFooter}>
              <ThemedText style={[styles.cardHolder, { color: theme.background + 'D0' }]}>
                {t('profile.demoCardLabel')}
              </ThemedText>
              <View style={styles.cardLogo}>
                <View style={[styles.cardCircle, { backgroundColor: '#FF006E' }]} />
                <View style={[styles.cardCircle, { backgroundColor: '#FFB703', marginLeft: -10 }]} />
              </View>
            </View>
          </Animated.View>

          {/* Top-up Success Badge */}
          {successVisible && (
            <View style={styles.successBadge}>
              <SymbolView
                tintColor="#38B000"
                name={{ ios: 'checkmark.seal.fill', android: 'check_circle', web: 'check_circle' }}
                size={14}
              />
              <ThemedText type="smallBold" style={{ color: '#38B000', marginLeft: Spacing.one }}>
                {t('profile.topupSuccess')}
              </ThemedText>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleTopUp}
              style={({ pressed }) => [
                styles.topUpButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView
                tintColor={theme.text}
                name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                size={18}
              />
              <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>
                {t('profile.topupBtn')}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                styles.resetButton,
                { borderColor: '#ff6b6b' },
                pressed && { backgroundColor: '#ff6b6b20' }
              ]}
            >
              <SymbolView
                tintColor="#ff6b6b"
                name={{ ios: 'arrow.counterclockwise.circle.fill', android: 'refresh', web: 'refresh' }}
                size={16}
              />
              <ThemedText type="smallBold" style={{ color: '#ff6b6b', marginLeft: Spacing.one }}>
                {t('profile.resetBtn')}
              </ThemedText>
            </Pressable>
          </View>

          {/* Daily Bonus Claim (Fortune Wheel) */}
          <FortuneWheel />

          {/* My Active Listings Section */}
          <View style={styles.unlockedSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {t('profile.myListingsSection').replace('%s', String(myItems.length))}
            </ThemedText>
            {myItems.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{ ios: 'doc.text.fill', android: 'article', web: 'article' }}
                  size={24}
                />
                <ThemedText type="smallBold" style={styles.emptyTitle}>
                  {t('profile.noListings')}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.myListingsContainer}>
                {myItems.map((item) => (
                  <MyListingItem 
                    key={item.id} 
                    listing={item} 
                    onDelete={() => handleDeleteListing(item.id)} 
                  />
                ))}
              </View>
            )}
          </View>

          {/* Transaction History Section */}
          <View style={[styles.unlockedSection, { marginTop: Spacing.four }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              {t('profile.transactionsSection')}
            </ThemedText>
            {transactions.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{ ios: 'list.bullet.indent', android: 'receipt_long', web: 'receipt_long' }}
                  size={24}
                />
                <ThemedText type="smallBold" style={styles.emptyTitle}>
                  Žiadne transakcie
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.transactionsListContainer, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                {transactions.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))}
              </View>
            )}
          </View>

          {/* Unlocked Contacts Section */}
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
                        {lastMsg ? `${lastMsg.sender === 'me' ? 'Ja' : 'Predajca'}: ${lastMsg.mediaUri ? (lastMsg.mediaType === 'image' ? t('chat.imageAttachment') : t('chat.videoAttachment')) : lastMsg.text}` : 'Žiadne správy'}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
      {activeChatId && (
        <SecureChatModal
          visible={activeChatId !== null}
          listingId={activeChatId}
          onClose={() => setActiveChatId(null)}
        />
      )}
    </ThemedView>
  );
}

const ValuesRow = ({ price, originalPrice }: { price: number; originalPrice?: number }) => {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <ThemedText type="smallBold" style={styles.unlockedItemPrice}>
        {price === 0 ? t('common.free') : `${price.toFixed(2)} €`}
      </ThemedText>
      {originalPrice && (
        <ThemedText type="small" style={styles.origPriceText}>
          {originalPrice.toFixed(2)} €
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
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  langGrid: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  langChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  walletCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    height: 180,
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
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
});
