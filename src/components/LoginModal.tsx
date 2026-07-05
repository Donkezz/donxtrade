import React, { useState } from 'react';
import { StyleSheet, View, Modal, Pressable, TextInput } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/context/AppContext';

export const LoginModal = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isLoginVisible, setLoginVisible, login } = useApp();
  const [email, setEmail] = useState('');

  const handleLogin = () => {
    if (email.trim().length > 0) {
      login(email.trim());
      setEmail('');
    }
  };

  return (
    <Modal
      visible={isLoginVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setLoginVisible(false)}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Prihlásenie (Demo)</ThemedText>
          <Pressable onPress={() => setLoginVisible(false)} style={styles.closeBtn}>
            <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any} size={24} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <SymbolView tintColor={theme.text} name={{ ios: 'person.crop.circle.badge.plus', android: 'person_add', web: 'person_add' } as any} size={64} style={{ alignSelf: 'center', marginBottom: Spacing.four }} />
          
          <ThemedText style={{ textAlign: 'center', marginBottom: Spacing.four }} themeColor="textSecondary">
            Zadaj "admin" pre prihlásenie ako majiteľ s prístupom k Dashboardu. Čokoľvek iné ťa prihlási ako bežného používateľa.
          </ThemedText>

          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="E-mail (napr. admin)"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: theme.text },
              pressed && { opacity: 0.8 }
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.background }}>Prihlásiť sa</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.five,
    paddingTop: Spacing.four,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
    fontSize: 16,
  },
  loginBtn: {
    height: 50,
    borderRadius: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
