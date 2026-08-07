import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, InputAccessoryView, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapPickerModal } from '@/components/MapPickerModal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ContactType, ListingCategory, ListingMedia, ListingType, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';
import { useCurrency } from '@/hooks/use-currency';

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

/** iOS numeric keyboards have no return key, so every number field shares one accessory bar. */
const NUMBER_PAD_ACCESSORY = 'donx-number-pad';

/** One-tap prices. 0 means "free", which is a common case here. */
const PRICE_PRESETS = [0, 5, 10, 20, 50];

/**
 * One-tap durations, from "rest of the day" to a week. Each carries its own
 * label key rather than composing "{count} {unit}" — Slovak, Polish and Ukrainian
 * inflect the noun by the number, and the set is small and fixed anyway.
 */
const DURATION_PRESETS = [
  { days: 0, hours: 4, labelKey: 'create.preset4Hours' },
  { days: 0, hours: 12, labelKey: 'create.preset12Hours' },
  { days: 1, hours: 0, labelKey: 'create.preset1Day' },
  { days: 3, hours: 0, labelKey: 'create.preset3Days' },
  { days: 7, hours: 0, labelKey: 'create.preset7Days' },
];

const MAX_DAYS = 30;
const MAX_HOURS = 23;
const MAX_MINUTES = 59;

/**
 * Keeps only digits and at most one separator, and accepts both `.` and `,` so a
 * user on a comma-decimal locale can type what their keyboard offers.
 * `decimals: 0` (HUF, JPY) drops the fractional part entirely.
 */
function sanitizeAmount(text: string, decimals: number): string {
  const unified = text.replace(',', '.');
  const cleaned = unified.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');

  if (decimals === 0 || rest.length === 0) {
    return whole;
  }
  return `${whole}.${rest.join('').slice(0, decimals)}`;
}

/** Digits only, clamped to a maximum. Empty stays empty so the field can be cleared. */
function sanitizeUnit(text: string, max: number): string {
  const digits = text.replace(/[^0-9]/g, '');
  if (digits === '') {
    return '';
  }
  return Math.min(max, parseInt(digits, 10)).toString();
}

/** Empty or partial input counts as zero when we need a number. */
function toNumber(text: string): number {
  const parsed = parseFloat(text);
  return isNaN(parsed) ? 0 : parsed;
}

export default function CreateScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { symbol: currencySign, decimals: currencyDecimals } = useCurrency();
  const { createListing, currentUser, setLoginVisible } = useApp();

  const scrollRef = useRef<ScrollView>(null);
  /** y offset of each number field group, captured on layout so we can scroll it clear of the keyboard. */
  const fieldOffsets = useRef<Record<string, number>>({});
  const [activeField, setActiveField] = useState<string | null>(null);

  const [type, setType] = useState<ListingType>('supply');
  const [category, setCategory] = useState<ListingCategory>('anything');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // A single amount, typed. Empty means "not set yet" and counts as free.
  const [priceText, setPriceText] = useState('');
  const [nowTs, setNowTs] = useState(() => Date.now());

  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [mapVisible, setMapVisible] = useState(false);
  
  // Expiry duration, typed as days / hours / minutes
  const [daysText, setDaysText] = useState('0');
  const [hoursText, setHoursText] = useState('4'); // Default 4 hours
  const [minutesText, setMinutesText] = useState('0');

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

  const price = toNumber(priceText);
  const durationMinutes =
    toNumber(daysText) * 1440 + toNumber(hoursText) * 60 + toNumber(minutesText);

  /**
   * Lifts the focused field above the keyboard. `KeyboardAvoidingView` alone only
   * shrinks the scroll area — it does not bring the field the user tapped into view.
   */
  const focusField = (key: string, groupKey: string = key) => {
    setActiveField(key);
    const y = fieldOffsets.current[groupKey];
    if (y === undefined) {
      return;
    }
    // Leave the label and a little breathing room visible above the field.
    scrollRef.current?.scrollTo({ y: Math.max(0, y - Spacing.four * 2), animated: true });
  };


  const applyDurationPreset = (preset: { days: number; hours: number }) => {
    setDaysText(preset.days.toString());
    setHoursText(preset.hours.toString());
    setMinutesText('0');
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
    let totalMs = durationMinutes * 60 * 1000;
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
    return t('create.expiryPreview', { date: dateStr, time: timeStr });
  };

  const handleSubmit = async () => {
    const finalPrice = price;

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
      setPriceText('');
      setLocation('');
      setLatitude(undefined);
      setLongitude(undefined);
      setDaysText('0');
      setHoursText('4');
      setMinutesText('0');
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
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={[
              styles.scrollContent,
              // Room to scroll the last fields clear of the keyboard.
              { paddingBottom: BottomTabInset + Spacing.five * 3 }
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

          {/* Price — one typed amount, so it works for currencies without decimals too */}
          <View
            style={styles.formGroup}
            onLayout={(event) => {
              fieldOffsets.current.price = event.nativeEvent.layout.y;
            }}
          >
            <ThemedText type="smallBold" style={styles.label}>{t('create.priceLabel')}</ThemedText>

            <View
              style={[
                styles.amountField,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: activeField === 'price' ? theme.text : theme.backgroundSelected,
                },
              ]}
            >
              <TextInput
                placeholder={currencyDecimals === 0 ? '0' : '0.00'}
                placeholderTextColor={theme.textSecondary}
                value={priceText}
                onChangeText={(text) => setPriceText(sanitizeAmount(text, currencyDecimals))}
                onFocus={() => focusField('price')}
                onBlur={() => setActiveField(null)}
                keyboardType="decimal-pad"
                inputAccessoryViewID={NUMBER_PAD_ACCESSORY}
                selectTextOnFocus
                style={[styles.amountInput, { color: theme.text }]}
              />
              <ThemedText type="subtitle" themeColor="textSecondary" style={styles.amountSuffix}>
                {currencySign}
              </ThemedText>
            </View>

            <View style={styles.presetRow}>
              {PRICE_PRESETS.map((preset) => {
                const selected = priceText !== '' && toNumber(priceText) === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => setPriceText(preset === 0 ? '0' : preset.toString())}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        backgroundColor: selected ? theme.text : theme.backgroundElement,
                        borderColor: selected ? theme.text : theme.backgroundSelected,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: selected ? theme.background : theme.text }}
                    >
                      {preset === 0 ? t('common.free') : `${preset} ${currencySign}`}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.helpText}>
              {t('create.priceHint')}
            </ThemedText>
          </View>

          {/* Validity — three small typed fields plus one-tap presets */}
          <View
            style={styles.formGroup}
            onLayout={(event) => {
              fieldOffsets.current.duration = event.nativeEvent.layout.y;
            }}
          >
            <ThemedText type="smallBold" style={styles.label}>{t('create.validityLabel')}</ThemedText>

            <View style={styles.durationRow}>
              {([
                { key: 'days', value: daysText, setter: setDaysText, max: MAX_DAYS, label: t('create.durationDays') },
                { key: 'hours', value: hoursText, setter: setHoursText, max: MAX_HOURS, label: t('create.durationHours') },
                { key: 'minutes', value: minutesText, setter: setMinutesText, max: MAX_MINUTES, label: t('create.durationMinutes') },
              ] as const).map((unit) => (
                <View
                  key={unit.key}
                  style={[
                    styles.durationField,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: activeField === unit.key ? theme.text : theme.backgroundSelected,
                    },
                  ]}
                >
                  <TextInput
                    value={unit.value}
                    onChangeText={(text) => unit.setter(sanitizeUnit(text, unit.max))}
                    onFocus={() => focusField(unit.key, 'duration')}
                    onBlur={() => {
                      setActiveField(null);
                      if (unit.value === '') unit.setter('0');
                    }}
                    keyboardType="number-pad"
                    inputAccessoryViewID={NUMBER_PAD_ACCESSORY}
                    selectTextOnFocus
                    style={[styles.durationInput, { color: theme.text }]}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.durationUnit}>
                    {unit.label}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.presetRow}>
              {DURATION_PRESETS.map((preset) => {
                const selected =
                  toNumber(daysText) === preset.days &&
                  toNumber(hoursText) === preset.hours &&
                  toNumber(minutesText) === 0;
                return (
                  <Pressable
                    key={`${preset.days}-${preset.hours}`}
                    onPress={() => applyDurationPreset(preset)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        backgroundColor: selected ? theme.text : theme.backgroundElement,
                        borderColor: selected ? theme.text : theme.backgroundSelected,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: selected ? theme.background : theme.text }}
                    >
                      {t(preset.labelKey)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.helpText}>
              {t('create.expiresText', { expiry: getFormattedExpiryPreview() })}
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

    {/*
      Numeric keyboards on iOS have no return key, so the user has no way to confirm
      or clear without this bar. Android's number pad already has both.
    */}
    {Platform.OS === 'ios' && (
      <InputAccessoryView nativeID={NUMBER_PAD_ACCESSORY}>
        <View style={[styles.keyboardBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.backgroundSelected }]}>
          <Pressable
            onPress={() => {
              if (activeField === 'price') setPriceText('');
              else if (activeField === 'days') setDaysText('');
              else if (activeField === 'hours') setHoursText('');
              else if (activeField === 'minutes') setMinutesText('');
            }}
            style={({ pressed }) => [styles.keyboardBarBtn, pressed && { opacity: 0.6 }]}
          >
            <SymbolView tintColor={theme.text} name={{ ios: 'delete.left', android: 'backspace', web: 'backspace' } as any} size={18} />
            <ThemedText type="small" style={styles.keyboardBarLabel}>{t('common.clear')}</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => Keyboard.dismiss()}
            style={({ pressed }) => [
              styles.keyboardBarConfirm,
              { backgroundColor: theme.text },
              pressed && { opacity: 0.8 },
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.background }}>{t('common.done')}</ThemedText>
          </Pressable>
        </View>
      </InputAccessoryView>
    )}

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
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  amountInput: {
    flex: 1,
    height: 56,
    fontSize: 28,
    fontWeight: '600',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  amountSuffix: {
    marginLeft: Spacing.two,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  durationField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  durationInput: {
    minWidth: 28,
    textAlign: 'right',
    fontSize: 22,
    fontWeight: '600',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  durationUnit: {
    marginLeft: 4,
    fontSize: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  keyboardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  keyboardBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  keyboardBarLabel: {
    marginLeft: Spacing.one,
  },
  keyboardBarConfirm: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
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
