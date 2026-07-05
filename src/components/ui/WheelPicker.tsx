import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Platform, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface WheelPickerProps {
  items: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  height?: number;
  itemHeight?: number;
  style?: StyleProp<ViewStyle>;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedValue,
  onValueChange,
  height = 120,
  itemHeight = 40,
  style,
}) => {
  const theme = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const selectedIndex = items.indexOf(selectedValue);
  
  useEffect(() => {
    if (selectedIndex !== -1) {
      // Small timeout to allow ScrollView layout to settle
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: selectedIndex * itemHeight,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedValue, selectedIndex]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < items.length) {
      onValueChange(items[index]);
    }
  };

  return (
    <View style={[styles.container, { height, backgroundColor: theme.backgroundElement }, style]}>
      {/* Selected Indicator Highlight Area */}
      <View 
        style={[
          styles.indicator, 
          { 
            height: itemHeight, 
            top: (height - itemHeight) / 2, 
            borderColor: theme.backgroundSelected,
            backgroundColor: theme.backgroundSelected + '25'
          }
        ]} 
      />
      
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentContainerStyle={{
          paddingVertical: (height - itemHeight) / 2,
        }}
      >
        {items.map((item, index) => {
          const isSelected = item === selectedValue;
          return (
            <View key={`${item}-${index}`} style={[styles.itemWrapper, { height: itemHeight }]}>
              <Text 
                style={[
                  styles.itemText, 
                  { color: theme.text },
                  isSelected && [styles.itemTextSelected, { color: theme.text }]
                ]}
              >
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  itemWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  itemText: {
    fontSize: 14,
    opacity: 0.35,
  },
  itemTextSelected: {
    fontSize: 18,
    fontWeight: 'bold',
    opacity: 1,
  },
});
