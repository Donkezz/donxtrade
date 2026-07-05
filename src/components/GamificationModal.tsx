import React from 'react';
import { StyleSheet, View, Modal, Pressable, ScrollView, Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface GamificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GamificationModal: React.FC<GamificationModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();

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
              <ThemedText type="subtitle" style={{ marginLeft: Spacing.two }}>Donx Kredity</ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark', android: 'close', web: 'close' } as any} size={24} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.three, fontSize: 16 }}>
              Vitaj v Donx: Nakupuj, predávaj a získavaj Kredity!
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.four, lineHeight: 20 }}>
              Donx je iný ako bežné bazáre. Neotravujeme ťa poplatkami – naopak, odmeňujeme ťa za to, že si aktívny! Kredity slúžia na odomykanie kontaktov a topovanie inzerátov.
            </ThemedText>

            {/* Block 1 */}
            <View style={[styles.infoBlock, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.iconWrapper}>
                <SymbolView tintColor="#00b894" name={{ ios: 'gift.fill', android: 'card_giftcard', web: 'card_giftcard' } as any} size={24} />
              </View>
              <View style={styles.textWrapper}>
                <ThemedText type="smallBold">1. Tvoj uvítací darček</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  Hneď po registrácii ti na účet pripíšeme 50 Kreditov. Tieto kredity ti vystačia na odomknutie až 50 kontaktov!
                </ThemedText>
              </View>
            </View>

            {/* Block 2 */}
            <View style={[styles.infoBlock, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.iconWrapper}>
                <SymbolView tintColor="#0984e3" name={{ ios: 'arrow.triangle.2.circlepath', android: 'autorenew', web: 'autorenew' } as any} size={24} />
              </View>
              <View style={styles.textWrapper}>
                <ThemedText type="smallBold">2. Zarábaj späť vlastnou aktivitou!</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  + 5 Kreditov získaš vždy, keď tvoj inzerát úspešne vybavíš a označíš ho ako vyriešený. Zarábaš dvojnásobne!{"\n"}
                  + 1 Kredit ti pripíšeme zakaždým, keď pridáš nový, zmysluplný inzerát.
                </ThemedText>
              </View>
            </View>

            {/* Block 3 */}
            <View style={[styles.infoBlock, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.iconWrapper}>
                <SymbolView tintColor="#e84393" name={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' } as any} size={24} />
              </View>
              <View style={styles.textWrapper}>
                <ThemedText type="smallBold">3. Buď videný (Topovanie)</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 2 }}>
                  Súrne niečo zháňaš alebo predávaš? Použi 5 kreditov a vystreľ svoj inzerát úplne na vrchol nástenky!
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
              <ThemedText type="smallBold" style={{ color: theme.background }}>Rozumiem, chcem Kredity!</ThemedText>
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
