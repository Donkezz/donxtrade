import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, View, PanResponder, GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScratchCardProps {
  children: React.ReactNode;
}

const COLS = 6;
const ROWS = 3;
const TOTAL_BLOCKS = COLS * ROWS;

export const ScratchCard: React.FC<ScratchCardProps> = ({ children }) => {
  const theme = useTheme();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [scratched, setScratched] = useState<boolean[]>(new Array(TOTAL_BLOCKS).fill(false));
  const [fullyRevealed, setFullyRevealed] = useState(false);

  const containerRef = useRef<View>(null);

  // Track layout width and height
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  // Determine which block is touched based on (x, y) coordinates
  const scratchAt = useCallback((x: number, y: number) => {
    if (dimensions.width === 0 || dimensions.height === 0 || fullyRevealed) return;

    const blockWidth = dimensions.width / COLS;
    const blockHeight = dimensions.height / ROWS;

    const col = Math.floor(x / blockWidth);
    const row = Math.floor(y / blockHeight);

    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      const index = row * COLS + col;
      if (!scratched[index]) {
        const nextScratched = [...scratched];
        nextScratched[index] = true;
        setScratched(nextScratched);

        // Check if 75% of blocks are scratched
        const scratchedCount = nextScratched.filter(Boolean).length;
        if (scratchedCount >= TOTAL_BLOCKS * 0.75) {
          setFullyRevealed(true);
        }
      }
    }
  }, [dimensions, scratched, fullyRevealed]);

  // Setup PanResponder with state dependencies, no ref accesses
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          scratchAt(locationX, locationY);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent;
          scratchAt(locationX, locationY);
        },
        onPanResponderRelease: () => {},
      }),
    [scratchAt]
  );

  // Render the blocks
  const renderBlocks = () => {
    if (dimensions.width === 0 || dimensions.height === 0) return null;

    const blockWidth = dimensions.width / COLS;
    const blockHeight = dimensions.height / ROWS;

    return (
      <View 
        style={styles.blocksOverlay} 
        {...panResponder.panHandlers}
      >
        {new Array(TOTAL_BLOCKS).fill(0).map((_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const left = col * blockWidth;
          const top = row * blockHeight;
          const isBlockScratched = scratched[i] || fullyRevealed;

          return (
            <ScratchBlock
              key={i}
              width={blockWidth}
              height={blockHeight}
              left={left}
              top={top}
              isScratched={isBlockScratched}
              theme={theme}
            />
          );
        })}

        {/* Scratch Call to Action */}
        {!fullyRevealed && (
          <View style={styles.ctaContainer} pointerEvents="none">
            <ThemedText type="smallBold" style={[styles.ctaText, { color: theme.background }]}>
              🤫 Zotrite pre odhalenie kontaktu
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View 
      ref={containerRef}
      onLayout={handleLayout} 
      style={[styles.container, { borderColor: theme.backgroundSelected }]}
    >
      {/* Target unlocked info */}
      <View style={styles.contentContainer}>
        {children}
      </View>

      {/* Grid blocks overlay */}
      {!fullyRevealed && renderBlocks()}
    </View>
  );
};

// Sub-component for individual blocks with Reanimated scale spring
interface ScratchBlockProps {
  width: number;
  height: number;
  left: number;
  top: number;
  isScratched: boolean;
  theme: any;
}

const ScratchBlock: React.FC<ScratchBlockProps> = ({ width, height, left, top, isScratched, theme }) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isScratched) {
      scale.value = withSpring(0, { damping: 12, stiffness: 100 });
    } else {
      scale.value = 1;
    }
  }, [isScratched, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.block,
        animatedStyle,
        {
          width: width - 0.5, // Tiny gap between blocks
          height: height - 0.5,
          left,
          top,
          backgroundColor: theme.textSecondary,
        }
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Spacing.two,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: Spacing.one,
  },
  contentContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blocksOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  block: {
    position: 'absolute',
    borderRadius: 2,
    opacity: 0.95,
  },
  ctaContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  ctaText: {
    fontSize: 10.5,
    textAlign: 'center',
    fontWeight: 'bold',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
});
