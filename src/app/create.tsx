import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapPickerModal } from '@/components/MapPickerModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WheelPicker } from '@/components/ui/WheelPicker';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ContactType, ListingCategory, ListingMedia, ListingType, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

const CATEGORY_OPTIONS: { labelKey: string; value: ListingCategory; icon: string; fallbackIcon: string; color: string }[] = [
  { labelKey: 'common.anything', value: 'anything', icon: 'square.grid.2x2', fallbackIcon: 'apps', color: '#6c5ce7' },
  { labelKey: 'common.clothing', value: 'clothing', icon: 'tshirt', fallbackIcon: 'checkroom', color: '#ff7675' },
  { labelKey: 'common.material', value: 'material', icon: 'shippingbox', fallbackIcon: 'inventory_2', color: '#fdcb6e' },
  { labelKey: 'common.kids', value: 'kids', icon: 'face.smiling.fill', fallbackIcon: 'face', color: '#00b894' },
  { labelKey: 'common.men', value: 'men', icon: 'bolt.fill', fallbackIcon: 'bolt', color: '#0984e3' },
  { labelKey: 'common.women', value: 'women', icon: 'heart.fill', fallbackIcon: 'favorite', color: '#e84393' },
  { labelKey: 'common.service', value: 'service', icon: 'wrench.and.screwdriver', fallbackIcon: 'build', color: '#8338EC' },
  { labelKey: 'common.meeting', value: 'meeting', icon: 'person.2', fallbackIcon: 'people', color: '#38B000' },
  { labelKey: 'common.tickets', value: 'tickets', icon: 'ticket', fallbackIcon: 'local_activity', color: '#FF006E' },
  { labelKey: 'common.electronics', value: 'electronics', icon: 'desktopcomputer', fallbackIcon: 'devices', color: '#2d3436' },
  { labelKey: 'common.home', value: 'home', icon: 'house', fallbackIcon: 'home', color: '#d63031' },
  { labelKey: 'common.pets', value: 'pets', icon: 'pawprint', fallbackIcon: 'pets', color: '#e17055' },
  { labelKey: 'common.sport', value: 'sport', icon: 'figure.run', fallbackIcon: 'sports_soccer', color: '#3A86F0' },
  { labelKey: 'common.auto', value: 'auto', icon: 'car', fallbackIcon: 'directions_car', color: '#b2bec3' },
];

// Price Picker constants
const EUROS_ITEMS = Array.from({ length: 201 }, (_, i) => i.toString()); // 0 to 200
const CENTS_ITEMS = ['.00', '.10', '.20', '.30', '.40', '.50', '.60', '.70', '.80', '.90'];

// Duration Picker constants
const DAYS_ITEMS = Array.from({ length: 31 }, (_, i) => i.toString()); // 0 to 30 days
const HOURS_ITEMS = Array.from({ length: 24 }, (_, i) => i.toString()); // 0 to 23 hours
const MINUTES_ITEMS = Array.from({ length: 60 }, (_, i) => i.toString()); // 0 to 59 minutes

export default function CreateScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { createListing, currentUser, setLoginVisible } = useApp();

  const [type, setType] = useState<ListingType>('supply');
  const [category, setCategory] = useState<ListingCategory>('anything');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Price state using Pickers + Manual input
  const [selectedEuros, setSelectedEuros] = useState('0');
  const [selectedCents, setSelectedCents] = useState('.00');
  const [customPriceText, setCustomPriceText] = useState('0.00');
  const [nowTs, setNowTs] = useState(() => Date.now());

  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [mapVisible, setMapVisible] = useState(false);
  
  // Expiry duration state (Days, Hours, Minutes)
  const [selectedDays, setSelectedDays] = useState('0');
  const [selectedHours, setSelectedHours] = useState('4'); // Default 4 hours
  const [selectedMinutes, setSelectedMinutes] = useState('0');

  const [isAnonymous, setIsAnonymous] = useState(true); // Default to true (recommended)
  const [ownerName, setOwnerName] = useState('');
  const [contactType, setContactType] = useState<ContactType>('chat');
  const [contactInfo, setContactInfo] = useState('');
  
  // Media uploads state
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync Price Pickers to Custom Text Input
  const handlePricePickerChange = (euros: string, cents: string) => {
    setSelectedEuros(euros);
    setSelectedCents(cents);
    const combinedVal = parseFloat(`${euros}${cents}`).toFixed(2);
    setCustomPriceText(combinedVal);
  };

  // Sync Text Input back to Price Pickers (snapping to nearest values)
  const handleCustomPriceTextChange = (text: string) => {
    setCustomPriceText(text);
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0) {
      const euros = Math.floor(parsed);
      const remainingCents = parsed - euros;
      // Round to nearest ten cents (.00, .10, etc)
      const centsIndex = Math.min(9, Math.max(0, Math.round(remainingCents * 10)));
      
      const matchedEurosStr = Math.min(200, euros).toString();
      const matchedCentsStr = CENTS_ITEMS[centsIndex];
      
      setSelectedEuros(matchedEurosStr);
      setSelectedCents(matchedCentsStr);
    }
  };

  const [mediaModalVisible, setMediaModalVisible] = useState(false);

  // Trigger modal instead of direct library picking
  const handlePickMedia = () => {
    if (media.length >= 5) {
      showAlert(t('common.warning'), t('create.mediaLimitText'));
      return;
    }
    setMediaModalVisible(true);
  };

  // 1. Pick from Photo Gallery
  const handlePickFromGallery = async () => {
    setMediaModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t('common.warning'), t('create.mediaLimitText'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - media.length,
    });

    if (!result.canceled) {
      const selected: ListingMedia[] = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      }));
      setMedia(prev => [...prev, ...selected].slice(0, 5));
    }
  };

  // 2. Take a photo with Camera (Allows editing/cropping!)
  const handleTakePhoto = async () => {
    setMediaModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert(t('common.warning'), "Aplikácia nemá prístup k fotoaparátu.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // system crop/resize
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const newPhoto: ListingMedia = {
        uri: asset.uri,
        type: 'image',
      };
      setMedia(prev => [...prev, newPhoto].slice(0, 5));
    }
  };

  // 3. Pick Document/File from device storage
  const handlePickDocument = async () => {
    setMediaModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileMedia: ListingMedia = {
          uri: asset.uri,
          type: asset.mimeType?.startsWith('video') ? 'video' : 'image',
        };
        setMedia(prev => [...prev, fileMedia].slice(0, 5));
      }
    } catch (err) {
      console.error('Document picking error:', err);
    }
  };

  const removeMedia = (idx: number) => {
    setMedia(prev => prev.filter((_, i) => i !== idx));
  };

  const getComputedDurationMs = () => {
    const d = parseInt(selectedDays, 10) || 0;
    const h = parseInt(selectedHours, 10) || 0;
    const m = parseInt(selectedMinutes, 10) || 0;
    let totalMs = (d * 24 * 3600 + h * 3600 + m * 60) * 1000;
    if (totalMs === 0) {
      totalMs = 15 * 60 * 1000; // minimum fallback is 15 minutes
    }
    return totalMs;
  };

  const getComputedExpiresAt = () => {
    return new Date(Date.now() + getComputedDurationMs()).toISOString();
  };

  const getFormattedExpiryPreview = () => {
    const expiryDate = new Date(nowTs + getComputedDurationMs());
    const timeStr = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = expiryDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr} o ${timeStr}`;
  };

  const handleSubmit = async () => {
    const finalPrice = parseFloat(customPriceText) || 0;

    // Validation
    if (!title.trim()) return showAlert(t('common.error'), t('create.validationTitle'));
    if (!description.trim()) return showAlert(t('common.error'), t('create.validationDesc'));
    if (!location.trim()) return showAlert(t('common.error'), t('create.validationLoc'));
    if (!isAnonymous && !ownerName.trim()) return showAlert(t('common.error'), t('create.validationName'));
    if (contactType === 'phone' && !contactInfo.trim()) return showAlert(t('common.error'), t('create.validationContact'));

    setSubmitting(true);

    try {
      await createListing({
        title: title.trim(),
        description: description.trim(),
        price: finalPrice,
        category,
        type,
        location: location.trim(),
        latitude,
        longitude,
        expiresAt: getComputedExpiresAt(),
        isAnonymous,
        ownerName: isAnonymous ? t('profile.anonymousUser') : ownerName.trim(),
        contactType,
        contactInfo: contactType === 'chat' ? 'Súkromný chat Donx' : contactInfo.trim(),
        media: media.length > 0 ? media : undefined,
      });

      // Reset Form
      setTitle('');
      setDescription('');
      setSelectedEuros('0');
      setSelectedCents('.00');
      setCustomPriceText('0.00');
      setLocation('');
      setLatitude(undefined);
      setLongitude(undefined);
      setSelectedDays('0');
      setSelectedHours('4');
      setSelectedMinutes('0');
      setIsAnonymous(true);
      setOwnerName('');
      setContactInfo('');
      setMedia([]);

      if (Platform.OS === 'web') {
        window.alert(t('create.successAlert'));
        router.push('/');
      } else {
        Alert.alert(t('common.success'), t('create.successAlert'), [
          { text: 'OK', onPress: () => router.push('/') }
        ]);
      }
    } catch {
      showAlert(t('common.error'), t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const showAlert = (titleStr: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${titleStr}: ${msg}`);
    } else {
      Alert.alert(titleStr, msg);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: BottomTabInset + Spacing.five }
            ]}
          >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="title">{t('create.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('create.subtitle')}
            </ThemedText>
          </View>

          {!currentUser ? (
            <View style={[styles.loginPrompt, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <SymbolView tintColor={theme.text} name={{ ios: 'lock.circle.fill', android: 'lock', web: 'lock' } as any} size={48} />
              <ThemedText type="subtitle" style={{ marginTop: Spacing.three, textAlign: 'center' }}>
                Prihláste sa
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.one, marginBottom: Spacing.four }}>
                Pre pridávanie nových inzerátov sa musíte prihlásiť.
              </ThemedText>
              <Pressable
                onPress={() => setLoginVisible(true)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.text },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.background }}>Prihlásiť sa</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
          {/* Type Toggle */}
          <ThemedText type="smallBold" style={styles.label}>{t('create.typeLabel')}</ThemedText>
          <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundElement }]}>
            <Pressable
              onPress={() => setType('supply')}
              style={[
                styles.toggleButton,
                type === 'supply' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }]
              ]}
            >
              <ThemedText type="smallBold" themeColor={type === 'supply' ? 'text' : 'textSecondary'}>
                {t('common.supply')}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setType('demand')}
              style={[
                styles.toggleButton,
                type === 'demand' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }]
              ]}
            >
              <ThemedText type="smallBold" themeColor={type === 'demand' ? 'text' : 'textSecondary'}>
                {t('common.demand')}
              </ThemedText>
            </Pressable>
          </View>

          {/* Category Chips */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 2 }}>
            <ThemedText type="smallBold" style={styles.label}>{t('create.categoryLabel')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ opacity: 0.6, fontSize: 11, marginBottom: 8 }}>Potiahnite pre viac 👉</ThemedText>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={true} 
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORY_OPTIONS.map((opt) => {
              const isSelected = category === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setCategory(opt.value)}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: isSelected ? opt.color : opt.color + '15',
                      borderColor: isSelected ? opt.color : 'transparent',
                    }
                  ]}
                >
                  <SymbolView
                    tintColor={isSelected ? '#ffffff' : opt.color}
                    name={{ ios: opt.icon as any, android: opt.fallbackIcon as any, web: opt.fallbackIcon as any }}
                    size={24}
                    style={styles.chipIcon}
                  />
                  <ThemedText 
                    type="smallBold" 
                    style={{ color: isSelected ? '#ffffff' : opt.color, marginTop: Spacing.half, textAlign: 'center' }}
                  >
                    {t(opt.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Text Inputs */}
          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>{t('create.titleLabel')}</ThemedText>
            <TextInput
              placeholder={t('create.titlePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>{t('create.descLabel')}</ThemedText>
            <TextInput
              placeholder={t('create.descPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
            />
          </View>

          {/* Photos and Videos */}
          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>{t('create.mediaLabel')}</ThemedText>
            <Pressable
              onPress={handlePickMedia}
              style={({ pressed }) => [
                styles.mediaPickButton,
                { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                pressed && { opacity: 0.8 }
              ]}
            >
              <SymbolView tintColor={theme.text} name={{ ios: 'camera.fill', web: 'camera_alt' }} size={16} />
              <ThemedText type="smallBold" style={{ marginLeft: Spacing.one }}>
                {t('create.mediaAddBtn')} ({media.length}/5)
              </ThemedText>
            </Pressable>

            {media.length > 0 && (
              <View style={styles.mediaPreviewContainer}>
                {media.map((item, idx) => (
                  <View key={idx} style={[styles.thumbnailWrapper, { borderColor: theme.backgroundSelected }]}>
                    <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                    <Pressable onPress={() => removeMedia(idx)} style={styles.deleteBadge}>
                      <SymbolView tintColor="#ffffff" name={{ ios: 'xmark.circle.fill', web: 'cancel' }} size={16} />
                    </Pressable>
                    {item.type === 'video' && (
                      <View style={styles.videoBadge}>
                        <SymbolView tintColor="#ffffff" name={{ ios: 'play.fill', web: 'play_arrow' }} size={10} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* iOS Style Drum Picker for Price */}
          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>{t('create.priceLabel')} (€)</ThemedText>
            <View style={styles.pickerSectionRow}>
              <View style={[styles.unifiedPickerContainer, { backgroundColor: theme.backgroundElement }]}>
                {/* Euros Picker */}
                <View style={styles.unifiedPickerColumn}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabelInline}>Eur</ThemedText>
                  <WheelPicker 
                    items={EUROS_ITEMS} 
                    selectedValue={selectedEuros} 
                    onValueChange={(val) => handlePricePickerChange(val, selectedCents)} 
                    style={{ backgroundColor: 'transparent', alignSelf: 'stretch' }}
                  />
                </View>

                <View style={[styles.pickerDivider, { backgroundColor: theme.backgroundSelected }]} />

                {/* Cents Picker */}
                <View style={styles.unifiedPickerColumn}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabelInline}>Cent</ThemedText>
                  <WheelPicker 
                    items={CENTS_ITEMS} 
                    selectedValue={selectedCents} 
                    onValueChange={(val) => handlePricePickerChange(selectedEuros, val)} 
                    style={{ backgroundColor: 'transparent', alignSelf: 'stretch' }}
                  />
                </View>
              </View>

              {/* Text Input Column */}
              <View style={[styles.pickerColumnWrapper, { flex: 0.6 }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabelInline}>Vlastná (€)</ThemedText>
                <View style={styles.pickerInputWrapper}>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor={theme.textSecondary}
                    value={customPriceText}
                    onChangeText={handleCustomPriceTextChange}
                    keyboardType="numeric"
                    style={[
                      styles.input, 
                      styles.pickerTextInput, 
                      { 
                        backgroundColor: theme.backgroundElement, 
                        color: theme.text, 
                        borderColor: theme.backgroundSelected 
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* iOS Style Drum Picker for Expiration (Days, Hours, Minutes) */}
          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>{t('create.validityLabel')}</ThemedText>
            <View style={[styles.unifiedPickerContainer, { backgroundColor: theme.backgroundElement }]}>
              {/* Days Picker */}
              <View style={styles.unifiedPickerColumn}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabelInline}>dni</ThemedText>
                <WheelPicker 
                  items={DAYS_ITEMS} 
                  selectedValue={selectedDays} 
                  onValueChange={setSelectedDays} 
                  style={{ backgroundColor: 'transparent', alignSelf: 'stretch' }}
                />
              </View>

              <View style={[styles.pickerDivider, { backgroundColor: theme.backgroundSelected }]} />

              {/* Hours Picker */}
              <View style={styles.unifiedPickerColumn}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabelInline}>hod</ThemedText>
                <WheelPicker 
                  items={HOURS_ITEMS} 
                  selectedValue={selectedHours} 
                  onValueChange={setSelectedHours} 
                  style={{ backgroundColor: 'transparent', alignSelf: 'stretch' }}
                />
              </View>

              <View style={[styles.pickerDivider, { backgroundColor: theme.backgroundSelected }]} />

              {/* Minutes Picker */}
              <View style={styles.unifiedPickerColumn}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.pickerLabelInline}>min</ThemedText>
                <WheelPicker 
                  items={MINUTES_ITEMS} 
                  selectedValue={selectedMinutes} 
                  onValueChange={setSelectedMinutes} 
                  style={{ backgroundColor: 'transparent', alignSelf: 'stretch' }}
                />
              </View>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.helpText}>
              {t('create.expiresText').replace('%s', getFormattedExpiryPreview()).replace('%s', '')}
            </ThemedText>
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>{t('create.locationLabel')}</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                placeholder={t('create.locationPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={location}
                onChangeText={setLocation}
                style={[styles.input, { flex: 1, backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
              />
              <Pressable
                onPress={() => setMapVisible(true)}
                style={({ pressed }) => [
                  styles.mapIconBtn,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <SymbolView tintColor={theme.text} name={{ ios: 'map.fill', android: 'map', web: 'map' } as any} size={20} />
              </Pressable>
            </View>
          </View>

          {/* Anonymity Switch */}
          <View style={[styles.anonymBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{t('create.anonymLabel')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.half }}>
                {t('create.anonymSub')}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setIsAnonymous(!isAnonymous)}
              style={[
                styles.checkbox,
                { borderColor: theme.textSecondary },
                isAnonymous && { backgroundColor: theme.text, borderColor: theme.text }
              ]}
            >
              {isAnonymous && (
                <SymbolView
                  tintColor={theme.background}
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={12}
                />
              )}
            </Pressable>
          </View>

          {/* Contact Method Selector */}
          <ThemedText type="smallBold" style={styles.label}>{t('create.contactMethodLabel')}</ThemedText>
          <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundElement, marginBottom: Spacing.four }]}>
            <Pressable
              onPress={() => setContactType('chat')}
              style={[
                styles.toggleButton,
                contactType === 'chat' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }]
              ]}
            >
              <ThemedText type="smallBold" themeColor={contactType === 'chat' ? 'text' : 'textSecondary'}>
                🔒 Súkromný čet
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setContactType('phone')}
              style={[
                styles.toggleButton,
                contactType === 'phone' && [styles.toggleActiveButton, { backgroundColor: theme.backgroundSelected }]
              ]}
            >
              <ThemedText type="smallBold" themeColor={contactType === 'phone' ? 'text' : 'textSecondary'}>
                Telefón / E-mail
              </ThemedText>
            </Pressable>
          </View>

          {/* Contact Details */}
          {!isAnonymous && (
            <View style={styles.formGroup}>
              <ThemedText type="smallBold" style={styles.label}>{t('create.myRealNameLabel')}</ThemedText>
              <TextInput
                placeholder={t('create.myRealNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={ownerName}
                onChangeText={setOwnerName}
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
              />
            </View>
          )}

          {contactType === 'phone' ? (
            <View style={styles.formGroup}>
              <ThemedText type="smallBold" style={styles.label}>{t('create.contactInfoLabel')}</ThemedText>
              <TextInput
                placeholder={t('create.contactInfoPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={contactInfo}
                onChangeText={setContactInfo}
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.helpText}>
                {t('create.contactInfoSub')}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.anonymBox, { backgroundColor: theme.backgroundElement + '50', borderColor: theme.backgroundSelected }]}>
              <SymbolView
                tintColor="#38B000"
                name={{ ios: 'lock.bubble.fill' as any, android: 'chat' as any, web: 'chat' as any }}
                size={16}
                style={{ marginRight: Spacing.two }}
              />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" style={{ color: '#38B000' }}>{t('create.secureChatTitle')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.half }}>
                  {t('create.secureChatSub')}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Submit Button */}
          {currentUser ? (
            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.submitButton,
                { backgroundColor: theme.text },
                pressed && { opacity: 0.8 },
                submitting && { opacity: 0.6 }
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.background, fontSize: 15 }}>
                {submitting ? t('create.submittingBtn') : t('create.submitBtn')}
              </ThemedText>
            </Pressable>
          ) : (
            <View style={[styles.loginPrompt, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <ThemedText style={{ marginBottom: Spacing.two }}>Na vytvorenie inzerátu sa musíte prihlásiť.</ThemedText>
              <Pressable
                onPress={() => setLoginVisible(true)}
                style={[styles.primaryButton, { backgroundColor: theme.text }]}
              >
                <ThemedText style={{ color: theme.background, fontWeight: 'bold' }}>Prihlásiť sa</ThemedText>
              </Pressable>
            </View>
          )}
          </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>

    <MapPickerModal
      visible={mapVisible}
      onClose={() => setMapVisible(false)}
      onSelectLocation={(address, lat, lng) => {
        setLocation(address);
        setLatitude(lat);
        setLongitude(lng);
        setMapVisible(false);
      }}
    />

    {/* Media Selection Modal */}
    <Modal
      visible={mediaModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setMediaModalVisible(false)}
    >
      <Pressable style={styles.modalOverlay} onPress={() => setMediaModalVisible(false)}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" style={styles.modalTitle}>Pridať prílohu</ThemedText>
          
          <Pressable style={styles.modalItem} onPress={handleTakePhoto}>
            <SymbolView tintColor={theme.text} name={{ ios: 'camera.fill', web: 'camera_alt' }} size={20} />
            <ThemedText type="smallBold" style={styles.modalItemText}>Fotoaparát (odfotiť a orezať)</ThemedText>
          </Pressable>

          <Pressable style={styles.modalItem} onPress={handlePickFromGallery}>
            <SymbolView tintColor={theme.text} name={{ ios: 'photo.on.rectangle.angled', web: 'photo_library' }} size={20} />
            <ThemedText type="smallBold" style={styles.modalItemText}>Galéria fotiek a videí</ThemedText>
          </Pressable>

          <Pressable style={styles.modalItem} onPress={handlePickDocument}>
            <SymbolView tintColor={theme.text} name={{ ios: 'doc.text.fill', web: 'insert_drive_file' }} size={20} />
            <ThemedText type="smallBold" style={styles.modalItemText}>Súbory z pamäte mobilu</ThemedText>
          </Pressable>

          <Pressable style={[styles.modalItem, { borderBottomWidth: 0, justifyContent: 'center' }]} onPress={() => setMediaModalVisible(false)}>
            <ThemedText type="smallBold" style={{ color: '#ff6b6b' }}>Zrušiť</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  </ThemedView>
  );
}

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
  label: {
    marginBottom: Spacing.two,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.one,
    marginBottom: Spacing.four,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
  toggleActiveButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryScroll: {
    gap: Spacing.three,
    paddingRight: Spacing.four,
    marginBottom: Spacing.four,
  },
  categoryChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
    minWidth: 90,
    minHeight: 90,
  },
  chipIcon: {
    marginBottom: Spacing.half,
  },
  formGroup: {
    marginBottom: Spacing.four,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  mediaPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
  },
  mediaPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: Spacing.one,
    overflow: 'visible',
    borderWidth: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: Spacing.one - 1,
  },
  deleteBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    padding: 2,
  },
  pickerSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  unifiedPickerContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unifiedPickerColumn: {
    flex: 1,
    alignItems: 'stretch', // Zmenené z 'center' pre širší dosah posúvania
    paddingVertical: Spacing.one,
  },
  pickerDivider: {
    width: 1,
    height: '100%',
  },
  pickerColumnWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabelInline: {
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  pickerInputWrapper: {
    height: 120,
    width: '100%',
    justifyContent: 'center',
  },
  pickerTextInput: {
    width: '100%',
    textAlign: 'center',
    height: 48,
    fontSize: 16,
    fontWeight: 'bold',
  },
  anonymBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: Spacing.one,
    marginLeft: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpText: {
    fontSize: 11,
    marginTop: Spacing.two,
  },
  submitButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
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
  mapIconBtn: {
    height: 50,
    width: 50,
    borderWidth: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    borderTopWidth: 1,
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
        borderBottomLeftRadius: Spacing.four,
        borderBottomRightRadius: Spacing.four,
        marginBottom: '5%',
      }
    })
  },
  modalTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalItemText: {
    marginLeft: Spacing.three,
    fontSize: 14,
  },
});
