import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface WheelPickerProps {
  items: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  height?: number;
  itemHeight?: number;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedValue,
  onValueChange,
  height = 120,
  itemHeight = 40,
}) => {
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);
  
  const selectedIndex = items.indexOf(selectedValue);
  
  useEffect(() => {
    if (selectedIndex !== -1) {
      // Small timeout to allow FlatList layout to settle
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: false,
          viewPosition: 0.5, // Center the item
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedValue, selectedIndex]);

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeight);
    if (index >= 0 && index < items.length) {
      onValueChange(items[index]);
    }
  };

  const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // For Web or platforms where momentum scroll doesn't fire as expected
    if (Platform.OS === 'web') {
      const y = event.nativeEvent.contentOffset.y;
      const index = Math.round(y / itemHeight);
      if (index >= 0 && index < items.length) {
        onValueChange(items[index]);
      }
    }
  };

  return (
    <View style={[styles.container, { height, backgroundColor: theme.backgroundElement }]}>
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
      
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item, idx) => `${item}-${idx}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        contentContainerStyle={{
          paddingVertical: (height - itemHeight) / 2,
        }}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        renderItem={({ item }) => {
          const isSelected = item === selectedValue;
          return (
            <View style={[styles.itemWrapper, { height: itemHeight }]}>
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
        }}
      />
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
