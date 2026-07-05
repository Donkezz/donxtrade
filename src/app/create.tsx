import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, ListingCategory, ListingType, ContactType, ListingMedia } from '@/context/AppContext';
import { WheelPicker } from '@/components/ui/WheelPicker';

const CATEGORY_OPTIONS: { labelKey: string; value: ListingCategory; icon: string; fallbackIcon: string; color: string }[] = [
  { labelKey: 'common.ski_pass', value: 'ski_pass', icon: 'figure.skiing.downhill', fallbackIcon: 'ticket', color: '#3A86F0' },
  { labelKey: 'common.ticket', value: 'ticket', icon: 'ticket', fallbackIcon: 'tag', color: '#FF006E' },
  { labelKey: 'common.service', value: 'service', icon: 'wrench.and.screwdriver', fallbackIcon: 'build', color: '#8338EC' },
  { labelKey: 'common.social', value: 'social', icon: 'person.2', fallbackIcon: 'people', color: '#38B000' },
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
  const { createListing } = useApp();

  const [type, setType] = useState<ListingType>('supply');
  const [category, setCategory] = useState<ListingCategory>('ski_pass');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Price state using Pickers + Manual input
  const [selectedEuros, setSelectedEuros] = useState('0');
  const [selectedCents, setSelectedCents] = useState('.00');
  const [customPriceText, setCustomPriceText] = useState('0.00');

  const [location, setLocation] = useState('');
  
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

  // Pick media (images/videos)
  const handlePickMedia = async () => {
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
    const expiryDate = new Date(Date.now() + getComputedDurationMs());
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
          <ThemedText type="smallBold" style={styles.label}>{t('create.categoryLabel')}</ThemedText>
          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map((opt) => {
              const isSelected = category === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setCategory(opt.value)}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: isSelected ? opt.color : theme.backgroundElement,
                      borderColor: isSelected ? opt.color : theme.backgroundSelected
                    }
                  ]}
                >
                  <SymbolView
                    tintColor={isSelected ? '#ffffff' : opt.color}
                    name={{ ios: opt.icon as any, android: opt.fallbackIcon as any, web: opt.fallbackIcon as any }}
                    size={14}
                    style={styles.chipIcon}
                  />
                  <ThemedText 
                    type="smallBold" 
                    style={{ color: isSelected ? '#ffffff' : theme.text }}
                  >
                    {t(opt.labelKey)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

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
                    style={{ backgroundColor: 'transparent' }}
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
                    style={{ backgroundColor: 'transparent' }}
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
                  style={{ backgroundColor: 'transparent' }}
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
                  style={{ backgroundColor: 'transparent' }}
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
                  style={{ backgroundColor: 'transparent' }}
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
            <TextInput
              placeholder={t('create.locationPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={location}
              onChangeText={setLocation}
              style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
            />
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
        </ScrollView>
      </SafeAreaView>
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  chipIcon: {
    marginRight: Spacing.one,
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
    alignItems: 'center',
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
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});
