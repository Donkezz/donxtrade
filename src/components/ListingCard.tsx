import React, { useState, useEffect } from 'react';
import { StyleSheet, Pressable, View, Alert, Platform, ScrollView, Share } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Listing, useApp } from '@/context/AppContext';
import { useCurrency } from '@/hooks/use-currency';
import { SecureChatModal } from './SecureChatModal';

interface ListingCardProps {
  listing: Listing;
  isUnlocked: boolean;
}

const CATEGORY_MAP: Record<string, { labelKey: string; icon: string; fallbackIcon: string; color: string }> = {
  anything: { labelKey: 'common.anything', icon: 'square.grid.2x2', fallbackIcon: 'apps', color: '#6c5ce7' },
  clothing: { labelKey: 'common.clothing', icon: 'tshirt', fallbackIcon: 'checkroom', color: '#ff7675' },
  material: { labelKey: 'common.material', icon: 'shippingbox', fallbackIcon: 'inventory_2', color: '#fdcb6e' },
  kids: { labelKey: 'common.kids', icon: 'face.smiling.fill', fallbackIcon: 'face', color: '#00b894' },
  men: { labelKey: 'common.men', icon: 'bolt.fill', fallbackIcon: 'bolt', color: '#0984e3' },
  women: { labelKey: 'common.women', icon: 'heart.fill', fallbackIcon: 'favorite', color: '#e84393' },
  service: { labelKey: 'common.service', icon: 'wrench.and.screwdriver', fallbackIcon: 'build', color: '#8338EC' },
  meeting: { labelKey: 'common.meeting', icon: 'person.2', fallbackIcon: 'people', color: '#38B000' },
  tickets: { labelKey: 'common.tickets', icon: 'ticket', fallbackIcon: 'local_activity', color: '#FF006E' },
  electronics: { labelKey: 'common.electronics', icon: 'desktopcomputer', fallbackIcon: 'devices', color: '#2d3436' },
  home: { labelKey: 'common.home', icon: 'house', fallbackIcon: 'home', color: '#d63031' },
  pets: { labelKey: 'common.pets', icon: 'pawprint', fallbackIcon: 'pets', color: '#e17055' },
  sport: { labelKey: 'common.sport', icon: 'figure.run', fallbackIcon: 'sports_soccer', color: '#3A86F0' },
  auto: { labelKey: 'common.auto', icon: 'car', fallbackIcon: 'directions_car', color: '#b2bec3' },
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
  const { format: formatPrice } = useCurrency();
  const { unlockContact, walletBalance, unlockFee, startChat, toggleLike, requireAuth } = useApp();
  const [loading, setLoading] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  const categoryInfo = CATEGORY_MAP[listing.category] || CATEGORY_MAP['anything'];
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
    requireAuth(() => {
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
    });
  };

  const performUnlock = async () => {
    setLoading(true);
    const success = await unlockContact(listing.id);
    setLoading(false);
    if (!success) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('listingCard.shareMessage', {
          title: listing.title,
          price: listing.price === 0 ? t('common.free') : formatPrice(listing.price),
        }),
      });
    } catch (error) {
      console.error(error);
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

      {/* Meta details: Location, Expiry & Interactions */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeftGroup}>
          <View style={styles.metaItem}>
            <SymbolView
              tintColor={theme.textSecondary}
              name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' } as any}
              size={12}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
              {listing.location}
            </ThemedText>
          </View>

          <View style={styles.metaItem}>
            <SymbolView
              tintColor={theme.textSecondary}
              name={{ ios: 'clock', android: 'schedule', web: 'schedule' } as any}
              size={12}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
              {timeLeftStr.includes(':') || timeLeftStr.toLowerCase().includes('expi') 
                ? timeLeftStr 
                : t('listingCard.timeLeft').replace('%s', timeLeftStr)}
            </ThemedText>
          </View>
        </View>

        {/* Interaction Buttons */}
        <View style={styles.interactionGroup}>
          <Pressable onPress={() => requireAuth(() => toggleLike(listing.id))} style={styles.iconButton}>
            <SymbolView 
              tintColor={listing.isLiked ? '#ff3b30' : theme.textSecondary} 
              name={{ ios: listing.isLiked ? 'heart.fill' : 'heart', android: listing.isLiked ? 'favorite' : 'favorite_border', web: listing.isLiked ? 'favorite' : 'favorite_border' } as any} 
              size={18} 
            />
            <ThemedText type="smallBold" style={{ color: listing.isLiked ? '#ff3b30' : theme.textSecondary, marginLeft: 4 }}>
              {listing.likes}
            </ThemedText>
          </Pressable>

          <Pressable onPress={handleShare} style={styles.iconButton}>
            <SymbolView 
              tintColor={theme.textSecondary} 
              name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' } as any} 
              size={18} 
            />
          </Pressable>
        </View>
      </View>

      {/* Price section & Unlock panel */}
      <View style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
        <View style={styles.priceContainer}>
          <ThemedText type="small" themeColor="textSecondary">{t('listingCard.priceLabel')}</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText type="subtitle" style={styles.priceValue}>
              {listing.price === 0 ? t('common.free') : formatPrice(listing.price)}
            </ThemedText>
            {listing.originalPrice && (
              <ThemedText type="small" style={styles.originalPrice}>
                {formatPrice(listing.originalPrice)}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.actionContainer}>
          {isUnlocked ? (
            <Animated.View entering={FadeIn} style={styles.unlockedBox}>
              {listing.contactType === 'chat' ? (
                <Pressable
                  onPress={() => {
                    requireAuth(() => {
                      const participantName = listing.isAnonymous ? t('profile.anonymousUser') : listing.ownerName;
                      startChat(listing.id, listing.title, participantName);
                      setChatVisible(true);
                    });
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    marginTop: Spacing.one,
  },
  metaLeftGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    gap: Spacing.three,
  },
  interactionGroup: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.one,
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
