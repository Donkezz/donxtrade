import React from 'react';
import { StyleSheet, View, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GamificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GamificationModal: React.FC<GamificationModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <SymbolView tintColor="#FFD700" name={{ ios: 'star.circle.fill', android: 'star', web: 'star' } as any} size={28} />
              <ThemedText type="subtitle" style={{ marginLeft: Spacing.two }}>{t('gamification.title')}</ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel={t('a11y.close')}>
              <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark', android: 'close', web: 'close' } as any} size={24} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.three, fontSize: 16 }}>
              {t('gamification.hello')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.four, lineHeight: 20 }}>
              {t('gamification.intro')}
            </ThemedText>

            {/* Block 1 */}
            <View style={[styles.infoBlock, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.iconWrapper}>
                <SymbolView tintColor="#00b894" name={{ ios: 'gift.fill', android: 'card_giftcard', web: 'card_giftcard' } as any} size={24} />
              </View>
              <View style={styles.textWrapper}>
                <ThemedText type="smallBold">{t('gamification.s1Title')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  {t('gamification.s1Text')}
                </ThemedText>
              </View>
            </View>

            {/* Block 2 */}
            <View style={[styles.infoBlock, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.iconWrapper}>
                <SymbolView tintColor="#0984e3" name={{ ios: 'arrow.triangle.2.circlepath', android: 'autorenew', web: 'autorenew' } as any} size={24} />
              </View>
              <View style={styles.textWrapper}>
                <ThemedText type="smallBold">{t('gamification.s2Title')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  {t('gamification.s2Text')}
                </ThemedText>
              </View>
            </View>

            {/* Block 3 */}
            <View style={[styles.infoBlock, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.iconWrapper}>
                <SymbolView tintColor="#e84393" name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' } as any} size={24} />
              </View>
              <View style={styles.textWrapper}>
                <ThemedText type="smallBold">{t('gamification.s3Title')}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  {t('gamification.s3Text')}
                </ThemedText>
              </View>
            </View>
            
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: theme.text },
                pressed && { opacity: 0.8 }
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.background }}>{t('gamification.cta')}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    maxHeight: '90%',
    minHeight: '60%',
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
        borderBottomLeftRadius: Spacing.four,
        borderBottomRightRadius: Spacing.four,
        marginBottom: '5%',
        maxHeight: '80%',
      }
    })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    padding: Spacing.one,
  },
  scrollArea: {
    paddingHorizontal: Spacing.four,
  },
  infoBlock: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.three,
  },
  iconWrapper: {
    marginRight: Spacing.three,
    marginTop: Spacing.half,
  },
  textWrapper: {
    flex: 1,
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
  },
  primaryBtn: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  }
});
