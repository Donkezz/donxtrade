import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Alert, Platform } from 'react-native';
import Svg, { Path, G, Circle, Text as SvgText } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCoins } from '@/utils/coins';
import { useApp } from '@/context/AppContext';

// Prizes are whole coins, not money. One coin buys one contact, so the smallest
// prize here is already worth something concrete to the player.
const SLICES = [
  { value: 1, color: '#3A86F0' },
  { value: 2, color: '#8338EC' },
  { value: 3, color: '#FF006E' },
  { value: 5, color: '#38B000' },
  { value: 8, color: '#FFB703' },
  { value: 15, color: '#D4AF37', jackpot: true }
];

const getSlicePath = (index: number) => {
  const R = 90;
  const cx = 100;
  const cy = 100;
  const startAngle = (index * 60 * Math.PI) / 180;
  const endAngle = ((index + 1) * 60 * Math.PI) / 180;
  
  const x1 = cx + R * Math.cos(startAngle);
  const y1 = cy + R * Math.sin(startAngle);
  const x2 = cx + R * Math.cos(endAngle);
  const y2 = cy + R * Math.sin(endAngle);
  
  return `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
};

const getLabelCoords = (index: number) => {
  const R_text = 65;
  const cx = 100;
  const cy = 100;
  const midAngle = ((index * 60 + 30) * Math.PI) / 180;
  return {
    x: cx + R_text * Math.cos(midAngle),
    y: cy + R_text * Math.sin(midAngle),
    angle: index * 60 + 30
  };
};

export const FortuneWheel: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { claimDailyBonus, lastClaimedBonus } = useApp();
  const [spinning, setSpinning] = useState(false);
  const [rewardWon, setRewardWon] = useState<number | null>(null);

  const rotation = useSharedValue(0);

  const isBonusAvailable = () => {
    if (!lastClaimedBonus) return true;
    const lastClaimDate = new Date(lastClaimedBonus);
    const diffTime = Math.abs(new Date().getTime() - lastClaimDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours >= 24;
  };

  const handleSpin = () => {
    if (spinning || !isBonusAvailable()) return;

    setSpinning(true);
    setRewardWon(null);

    // 1. Choose winning slice
    const winIndex = Math.floor(Math.random() * SLICES.length);
    const prize = SLICES[winIndex];

    // 2. Math to center winning slice at the top pointer (270 degrees)
    // Slices are 60 deg each. Top center is 270 deg.
    const targetSliceCenter = winIndex * 60 + 30;
    const targetAngle = (270 - targetSliceCenter + 360) % 360;
    
    // 3. 5 full rotations (1800 deg) + target offset
    const totalRotation = 1800 + targetAngle;

    // Reset rotation first (modulo 360 to prevent jumping back)
    rotation.value = rotation.value % 360;

    rotation.value = withTiming(
      totalRotation,
      {
        duration: 4000,
        easing: Easing.out(Easing.quad),
      },
      (finished) => {
        if (finished) {
          runOnJS(handleSpinComplete)(prize.value);
        }
      }
    );
  };

  const handleSpinComplete = async (prizeValue: number) => {
    const success = await claimDailyBonus(prizeValue);
    setSpinning(false);
    if (success) {
      setRewardWon(prizeValue);
      const winMessage = t('profile.winText', { amount: formatCoins(prizeValue) });
      if (Platform.OS === 'web') {
        window.alert(winMessage);
      } else {
        Alert.alert(t('profile.winHeader'), winMessage);
      }
    } else {
      Alert.alert(t('common.error'), t('profile.spinError'));
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const available = isBonusAvailable();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
      <View style={styles.headerContainer}>
        <View style={{ flex: 1, paddingRight: Spacing.two }}>
          <ThemedText type="smallBold">{t('profile.dailyBonusTitle')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtext}>
            {available 
              ? t('profile.spinAvailableText', 'Roztočte koleso a vyhrajte denný kredit!') 
              : t('profile.spinClaimedText', 'Dnešný bonus je vybraný. Príďte opäť zajtra!')}
          </ThemedText>
        </View>

        {!available && (
          <View style={styles.claimedBadge}>
            <SymbolView
              tintColor="#38B000"
              name={{ ios: 'checkmark.seal.fill', android: 'check_circle', web: 'check_circle' }}
              size={12}
            />
            <ThemedText type="smallBold" style={styles.claimedText}>
              {t('profile.claimed', 'Vybrané')}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.wheelWrapper}>
        {/* Outer Wheel Container */}
        <View style={styles.wheelOuter}>
          {/* Animated Wheel View (Spins around center) */}
          <Animated.View style={[animatedStyle, styles.wheelInner]}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
              <G>
                {/* Slices */}
                {SLICES.map((slice, i) => {
                  const coords = getLabelCoords(i);
                  return (
                    <G key={i}>
                      <Path d={getSlicePath(i)} fill={slice.color} stroke={theme.backgroundElement} strokeWidth={1.5} />
                      {/* Labels */}
                      <G transform={`translate(${coords.x}, ${coords.y}) rotate(${coords.angle + 90})`}>
                        <SvgText
                          x={0}
                          y={0}
                          fill="#ffffff"
                          fontSize={8}
                          fontWeight="bold"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                        >
                          {slice.value}{slice.jackpot ? ' 👑' : ''}
                        </SvgText>
                      </G>
                    </G>
                  );
                })}
                <Circle cx={100} cy={100} r={12} fill="#ffffff" />
                <Circle cx={100} cy={100} r={8} fill={theme.text} />
              </G>
            </Svg>
          </Animated.View>

          {/* Static Top Pointer/Needle */}
          <View style={styles.pointerContainer}>
            <Svg width={20} height={26} viewBox="0 0 20 26">
              <Path
                d="M 10 26 L 3 2 L 17 2 Z"
                fill="#ff3b30"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              <Circle cx={10} cy={6} r={3} fill="#ffffff" />
            </Svg>
          </View>
        </View>

        {/* Spin Button */}
        {available ? (
          <Pressable
            onPress={handleSpin}
            disabled={spinning}
            style={({ pressed }) => [
              styles.spinButton,
              { backgroundColor: theme.text },
              pressed && { opacity: 0.8 },
              spinning && { opacity: 0.5 }
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.background, fontSize: 13 }}>
              {spinning ? t('profile.spinning', 'Točím...') : t('profile.spinBtn', 'Roztočiť!')}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.countdownContainer}>
            {rewardWon && (
              <ThemedText type="smallBold" style={styles.wonAmountText}>
                {formatCoins(rewardWon)}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary" style={styles.nextSpinText}>
              {t('profile.nextSpinText', 'Nový spin o 24 hod.')}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.three,
  },
  subtext: {
    marginTop: Spacing.half,
    fontSize: 12,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38B00015',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  claimedText: {
    color: '#38B000',
    fontSize: 11,
    marginLeft: Spacing.one,
  },
  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  wheelOuter: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wheelInner: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    top: -2,
    left: '50%',
    marginLeft: -10,
    zIndex: 10,
    elevation: 3,
  },
  spinButton: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  wonAmountText: {
    color: '#38B000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  nextSpinText: {
    fontSize: 11,
    marginTop: Spacing.half,
  },
});
