import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Modal, Pressable, Platform, Alert, ActivityIndicator } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (address: string, lat: number, lng: number) => void;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({ visible, onClose, onSelectLocation }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const [region, setRegion] = useState<Region>({
    latitude: 49.065, // Default around Liptovský Mikuláš / Jasná
    longitude: 19.58,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [locationGranted, setLocationGranted] = useState(false);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    })();
  }, []);

  const handleLocateMe = async () => {
    if (!locationGranted) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Chyba', 'Prístup k polohe bol zamietnutý.');
        return;
      }
      setLocationGranted(true);
    }

    try {
      setLoadingAddress(true);
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Chyba', 'Nepodarilo sa získať aktuálnu polohu.');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleRegionChangeComplete = async (newRegion: Region) => {
    setRegion(newRegion);
    
    // Reverse Geocode the center
    try {
      setLoadingAddress(true);
      const geocode = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const addressParts = [];
        if (place.city) addressParts.push(place.city);
        else if (place.subregion) addressParts.push(place.subregion);
        else if (place.region) addressParts.push(place.region);

        if (place.street) addressParts.push(place.street);

        if (addressParts.length > 0) {
          setCurrentAddress(addressParts.join(', '));
        } else {
          setCurrentAddress(`${newRegion.latitude.toFixed(4)}, ${newRegion.longitude.toFixed(4)}`);
        }
      }
    } catch (e) {
      console.error('Geocode error:', e);
      setCurrentAddress('Neznáma lokalita');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleConfirm = () => {
    onSelectLocation(currentAddress, region.latitude, region.longitude);
  };

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Výber z mapy</ThemedText>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any} size={24} />
            </Pressable>
          </View>
          <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
            <ThemedText style={{ textAlign: 'center' }}>Mapy nie sú dostupné vo webovom prehliadači.</ThemedText>
          </View>
        </ThemedView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle">Vyberte lokalitu</ThemedText>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any} size={24} />
          </Pressable>
        </View>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={locationGranted}
            showsMyLocationButton={false}
          />
          
          {/* Center Pin Overlay */}
          <View style={styles.centerPinContainer} pointerEvents="none">
            <SymbolView 
              tintColor="#ff4757" 
              name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' } as any} 
              size={40} 
            />
          </View>

          {/* Locate Me Button Overlay */}
          <Pressable 
            style={[styles.locateBtn, { backgroundColor: theme.backgroundElement, shadowColor: theme.text }]} 
            onPress={handleLocateMe}
          >
            <SymbolView tintColor={theme.text} name={{ ios: 'location.fill', android: 'my_location', web: 'my_location' } as any} size={20} />
          </Pressable>
        </View>

        {/* Bottom Panel */}
        <View style={[styles.bottomPanel, { backgroundColor: theme.background, borderTopColor: theme.backgroundSelected }]}>
          <View style={{ flex: 1, marginRight: Spacing.two }}>
            <ThemedText type="small" themeColor="textSecondary">Zvolená lokalita:</ThemedText>
            {loadingAddress ? (
              <ActivityIndicator size="small" color={theme.text} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
            ) : (
              <ThemedText type="smallBold" numberOfLines={1}>{currentAddress || 'Presuňte mapu...'}</ThemedText>
            )}
          </View>

          <Pressable
            onPress={handleConfirm}
            disabled={loadingAddress || !currentAddress}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: theme.text },
              pressed && { opacity: 0.8 },
              (loadingAddress || !currentAddress) && { opacity: 0.5 }
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.background }}>Potvrdiť</ThemedText>
          </Pressable>
        </View>

      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20, // half of icon size
    marginTop: -40, // icon size (pointing down)
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateBtn: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomPanel: {
    padding: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  confirmBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  }
});
