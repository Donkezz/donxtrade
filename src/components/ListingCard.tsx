import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, View, Alert, Platform, ScrollView } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Listing, useApp } from '@/context/AppContext';
import { SecureChatModal } from './SecureChatModal';
import { ScratchCard } from './ScratchCard';

interface ListingCardProps {
  listing: Listing;
  isUnlocked: boolean;
}

const CATEGORY_MAP = {
  ski_pass: { labelKey: 'common.ski_pass', icon: 'figure.skiing.downhill', fallbackIcon: 'ticket', color: '#3A86F0' },
  ticket: { labelKey: 'common.ticket', icon: 'ticket', fallbackIcon: 'tag', color: '#FF006E' },
  service: { labelKey: 'common.service', icon: 'wrench.and.screwdriver', fallbackIcon: 'build', color: '#8338EC' },
  social: { labelKey: 'common.social', icon: 'person.2', fallbackIcon: 'people', color: '#38B000' },
};

const VideoPlayerItem = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      style={styles.mediaVideo}
      player={player}
    />
  );
};

export const ListingCard: React.FC<ListingCardProps> = ({ listing, isUnlocked }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { unlockContact, walletBalance, unlockFee, startChat } = useApp();
  const [loading, setLoading] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  const categoryInfo = CATEGORY_MAP[listing.category];
  const isSupply = listing.type === 'supply';

  // Dynamic time remaining calculation
  useEffect(() => {
    const updateTimeLeft = () => {
      const expiry = new Date(listing.expiresAt).getTime();
      const diffMs = expiry - Date.now();
      if (diffMs <= 0) {
        setTimeLeftStr(t('listingCard.expired'));
        return;
      }
      
      const totalMin = Math.floor(diffMs / 60000);
      const days = Math.floor(totalMin / 1440);
      const hours = Math.floor((totalMin % 1440) / 60);
      const mins = totalMin % 60;
      
      if (days > 0) {
        // approx or exact format: e.g. "2d 4h"
        setTimeLeftStr(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeftStr(`${hours}h ${mins}m`);
      } else {
        setTimeLeftStr(`${mins}m`);
      }
    };
    
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 30000); // every 30s
    return () => clearInterval(interval);
  }, [listing.expiresAt, t]);

  const handleUnlock = () => {
    if (walletBalance < unlockFee) {
      Alert.alert(
        t('listingCard.insufficientFundsTitle'),
        t('listingCard.insufficientFundsSub'),
        [{ text: 'OK' }]
      );
      return;
    }

    const confirmMessage = t('listingCard.unlockConfirm');
    
    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm(confirmMessage);
      if (confirmWeb) {
        performUnlock();
      }
    } else {
      Alert.alert(
        t('listingCard.unlockBtn'),
        confirmMessage,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: performUnlock }
        ]
      );
    }
  };

  const performUnlock = async () => {
    setLoading(true);
    const success = await unlockContact(listing.id);
    setLoading(false);
    if (!success) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  return (
    <Animated.View 
      layout={LinearTransition}
      style={[
        styles.card, 
        { 
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        }
      ]}
    >
      {/* Header: Category Badge & Type Badge */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', gap: Spacing.one }}>
          <View style={[styles.badge, { backgroundColor: categoryInfo.color + '20' }]}>
            <SymbolView
              tintColor={categoryInfo.color}
              name={{ 
                ios: categoryInfo.icon as any, 
                android: categoryInfo.fallbackIcon as any, 
                web: categoryInfo.fallbackIcon as any 
              }}
              size={13}
              style={styles.badgeIcon}
            />
            <ThemedText style={[styles.badgeText, { color: categoryInfo.color }]}>
              {t(categoryInfo.labelKey)}
            </ThemedText>
          </View>

          {listing.isDemo && (
            <View style={[styles.badge, { backgroundColor: '#8e8e9325' }]}>
              <ThemedText style={[styles.badgeText, { color: '#8e8e93' }]}>
                Demo
              </ThemedText>
            </View>
          )}
        </View>

        <View 
          style={[
            styles.badge, 
            { backgroundColor: isSupply ? '#2a4d34' : '#573c1d' } // Subtle green for supply, orange for demand
          ]}
        >
          <ThemedText style={[styles.badgeText, { color: isSupply ? '#69db7c' : '#ffd43b' }]}>
            {isSupply ? t('common.supply') : t('common.demand')}
          </ThemedText>
        </View>
      </View>

      {/* Title & Description */}
      <View style={styles.body}>
        <ThemedText type="subtitle" style={styles.title}>
          {listing.title}
        </ThemedText>
        <ThemedText style={styles.description} themeColor="textSecondary">
          {listing.description}
        </ThemedText>
      </View>

      {/* Photo/Video Carousel */}
      {listing.media && listing.media.length > 0 && (
        <View style={styles.mediaContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaList}
          >
            {listing.media.map((item, idx) => (
              <View key={idx} style={[styles.mediaWrapper, { borderColor: theme.backgroundSelected }]}>
                {item.type === 'image' ? (
                  <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                ) : (
                  <VideoPlayerItem uri={item.uri} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Meta details: Location, Expiry & Price */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' }}
            size={12}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
            {listing.location}
          </ThemedText>
        </View>

        <View style={styles.metaItem}>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
            size={12}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
            {timeLeftStr.includes(':') || timeLeftStr.toLowerCase().includes('expi') 
              ? timeLeftStr 
              : t('listingCard.timeLeft').replace('%s', timeLeftStr)}
          </ThemedText>
        </View>
      </View>

      {/* Price section & Unlock panel */}
      <View style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
        <View style={styles.priceContainer}>
          <ThemedText type="small" themeColor="textSecondary">{t('listingCard.priceLabel')}</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText type="subtitle" style={styles.priceValue}>
              {listing.price === 0 ? t('common.free') : `${listing.price.toFixed(2)} €`}
            </ThemedText>
            {listing.originalPrice && (
              <ThemedText type="small" style={styles.originalPrice}>
                {listing.originalPrice.toFixed(2)} €
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.actionContainer}>
          {isUnlocked ? (
            <ScratchCard>
              <Animated.View entering={FadeIn} style={styles.unlockedBox}>
                {listing.contactType === 'chat' ? (
                  <Pressable
                    onPress={async () => {
                      const participantName = listing.isAnonymous ? t('profile.anonymousUser') : listing.ownerName;
                      await startChat(listing.id, listing.title, participantName);
                      setChatVisible(true);
                    }}
                    style={({ pressed }) => [
                      styles.unlockButton,
                      { backgroundColor: '#38B000' },
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.one }}>
                      <SymbolView
                        tintColor="#ffffff"
                        name={{ ios: 'lock.bubble.fill' as any, android: 'chat' as any, web: 'chat' as any }}
                        size={12}
                      />
                      <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                        {t('listingCard.chatBtn')}
                      </ThemedText>
                    </View>
                  </Pressable>
                ) : (
                  <View style={{ alignItems: 'center', width: '100%' }}>
                    <View style={styles.unlockedHeader}>
                      <SymbolView
                        tintColor="#38B000"
                        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                        size={12}
                      />
                      <ThemedText type="smallBold" style={{ color: '#38B000', marginLeft: Spacing.one }}>
                        {listing.isAnonymous ? t('listingCard.unlockedAnonLabel') : t('listingCard.unlockedLabel')}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" style={styles.ownerName}>
                      {listing.isAnonymous ? t('profile.anonymousUser') : listing.ownerName}
                    </ThemedText>
                    <ThemedText type="code" style={[styles.contactValue, { backgroundColor: theme.backgroundSelected, color: theme.text }]} selectable>
                      {listing.contactInfo}
                    </ThemedText>
                  </View>
                )}
              </Animated.View>
            </ScratchCard>
          ) : (
            <Pressable 
              onPress={handleUnlock}
              disabled={loading}
              style={({ pressed }) => [
                styles.unlockButton,
                { backgroundColor: theme.text },
                pressed && { opacity: 0.8 }
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {t('listingCard.unlockBtn')}
              </ThemedText>
            </Pressable>
          )}
        </View>
      </View>
      {listing.contactType === 'chat' && (
        <SecureChatModal
          visible={chatVisible}
          listingId={listing.id}
          onClose={() => setChatVisible(false)}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  badgeIcon: {
    marginRight: Spacing.one,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  body: {
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  mediaContainer: {
    marginVertical: Spacing.two,
  },
  mediaList: {
    gap: Spacing.two,
  },
  mediaWrapper: {
    width: 120,
    height: 120,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mediaImage: {
    width: 120,
    height: 120,
  },
  mediaVideo: {
    width: 120,
    height: 120,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.three,
    marginTop: Spacing.one,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: Spacing.one,
    fontSize: 12,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  actionContainer: {
    flex: 1,
    marginLeft: Spacing.three,
    alignItems: 'flex-end',
  },
  unlockButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockedBox: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
  },
  unlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  ownerName: {
    fontSize: 11,
    opacity: 0.7,
  },
  contactValue: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: Spacing.half,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.one,
  },
});
