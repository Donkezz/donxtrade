import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCurrency } from '@/hooks/use-currency';
import { Listing, useApp } from '@/context/AppContext';

const CATEGORY_COLORS: Record<string, string> = {
  anything: '#6c5ce7', clothing: '#ff7675', material: '#fdcb6e', kids: '#00b894',
  men: '#0984e3', women: '#e84393', service: '#8338EC', meeting: '#38B000',
  tickets: '#FF006E', electronics: '#2d3436', home: '#d63031', pets: '#e17055',
  sport: '#3A86F0', auto: '#b2bec3',
};

/**
 * Compact row for the marketplace list. Shows only what helps someone decide
 * whether to open a listing — the full text, media gallery and contact panel
 * live on the detail screen.
 */
export const ListingPreview: React.FC<{ listing: Listing }> = ({ listing }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { format: formatPrice } = useCurrency();
  const { toggleLike, currentUser, setLoginVisible } = useApp();

  const [timeLeftStr, setTimeLeftStr] = useState('');
  const isSupply = listing.type === 'supply';
  const accent = CATEGORY_COLORS[listing.category] ?? '#6c5ce7';
  const cover = listing.media?.find((m) => m.type === 'image');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(listing.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftStr(t('listingCard.expired'));
        return;
      }
      const totalMin = Math.floor(diff / 60000);
      const days = Math.floor(totalMin / 1440);
      const hours = Math.floor((totalMin % 1440) / 60);
      const mins = totalMin % 60;
      // Invariant abbreviations — these sit next to a number in every language.
      if (days > 0) setTimeLeftStr(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeftStr(`${hours}h ${mins}min`);
      else setTimeLeftStr(`${mins}min`);
    };
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [listing.expiresAt, t]);

  const handleLike = () => {
    if (!currentUser) {
      setLoginVisible(true);
      return;
    }
    toggleLike(listing.id);
  };

  return (
    <Animated.View layout={LinearTransition}>
      <Pressable
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
          pressed && { opacity: 0.75 },
        ]}
      >
        <View style={styles.row}>
          {cover ? (
            <Image source={{ uri: cover.uri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: accent + '18' }]}>
              <SymbolView
                tintColor={accent}
                name={{ ios: 'photo', android: 'image', web: 'image' } as any}
                size={22}
              />
            </View>
          )}

          <View style={styles.main}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: accent + '20' }]}>
                <ThemedText style={[styles.badgeText, { color: accent }]}>
                  {t(`common.${listing.category}`)}
                </ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: isSupply ? '#2a4d34' : '#573c1d' }]}>
                <ThemedText style={[styles.badgeText, { color: isSupply ? '#69db7c' : '#ffd43b' }]}>
                  {isSupply ? t('common.supply') : t('common.demand')}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
              {listing.title}
            </ThemedText>

            <View style={styles.metaRow}>
              {/* Location gives up width first; the remaining time must stay on one line. */}
              <View style={styles.metaItemFlexible}>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{ ios: 'mappin.and.ellipse', android: 'place', web: 'place' } as any}
                  size={11}
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.metaText} numberOfLines={1}>
                  {listing.location}
                </ThemedText>
              </View>

              <View style={styles.metaItemFixed}>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{ ios: 'clock', android: 'schedule', web: 'schedule' } as any}
                  size={11}
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.metaText} numberOfLines={1}>
                  {timeLeftStr}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle" style={styles.price}>
            {listing.price === 0 ? t('common.free') : formatPrice(listing.price)}
          </ThemedText>

          <Pressable onPress={handleLike} hitSlop={8} style={styles.likeBtn}>
            <SymbolView
              tintColor={listing.isLiked ? '#ff3b30' : theme.textSecondary}
              name={{
                ios: listing.isLiked ? 'heart.fill' : 'heart',
                android: listing.isLiked ? 'favorite' : 'favorite_border',
                web: listing.isLiked ? 'favorite' : 'favorite_border',
              } as any}
              size={16}
            />
            <ThemedText
              type="smallBold"
              style={{ color: listing.isLiked ? '#ff3b30' : theme.textSecondary, marginLeft: 4 }}
            >
              {listing.likes}
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Spacing.two,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    marginTop: Spacing.one,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  metaItemFlexible: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  metaItemFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  metaText: {
    fontSize: 11,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
  },
  price: {
    fontSize: 18,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
