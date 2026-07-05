import React, { useState } from 'react';
import { StyleSheet, View, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    // Demo login: simply logs in with email as username
    if (email.trim().length > 0) {
      login(email.trim());
      setEmail('');
      setPassword('');
      setLoginVisible(false);
    }
  };

  return (
    <Modal
      visible={isLoginVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setLoginVisible(false)}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ThemedView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <ThemedText type="subtitle">{mode === 'login' ? 'Prihlásenie' : 'Vytvoriť účet'}</ThemedText>
              <Pressable onPress={() => setLoginVisible(false)} style={styles.closeBtn}>
                <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any} size={24} />
              </Pressable>
            </View>

            <View style={styles.content}>
              {/* Social Logins */}
              <View style={styles.socialContainer}>
                {Platform.OS === 'ios' && (
                  <Pressable style={[styles.socialBtn, { backgroundColor: '#000000' }]}>
                    <SymbolView tintColor="#ffffff" name={{ ios: 'applelogo', android: 'person', web: 'person' } as any} size={20} />
                    <ThemedText style={{ color: '#ffffff', marginLeft: Spacing.two, fontWeight: 'bold' }}>Pokračovať s Apple</ThemedText>
                  </Pressable>
                )}

                <Pressable style={[styles.socialBtn, { backgroundColor: '#ffffff', borderColor: '#e0e0e0', borderWidth: 1 }]}>
                  <ThemedText style={{ color: '#000000', fontWeight: 'bold' }}>G  Pokračovať s Google</ThemedText>
                </Pressable>

                <Pressable style={[styles.socialBtn, { backgroundColor: '#1877F2' }]}>
                  <ThemedText style={{ color: '#ffffff', fontWeight: 'bold' }}>f  Pokračovať s Facebook</ThemedText>
                </Pressable>
              </View>

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
                <ThemedText style={{ marginHorizontal: Spacing.two }} themeColor="textSecondary">alebo</ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.backgroundSelected }]} />
              </View>

              {/* Email / Password */}
              <ThemedText style={{ textAlign: 'center', marginBottom: Spacing.three }} themeColor="textSecondary" type="small">
                Použiť e-mail alebo telefónne číslo
              </ThemedText>

              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="E-mail alebo telefón (Demo: admin)"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder="Heslo (Demo: hocičo)"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.loginBtn,
                  { backgroundColor: theme.text },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  {mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet'}
                </ThemedText>
              </Pressable>

              {/* Toggle Mode */}
              <Pressable 
                style={styles.toggleModeBtn} 
                onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  {mode === 'login' ? 'Nemáte účet? ' : 'Už máte účet? '}
                  <ThemedText type="smallBold" themeColor="text">
                    {mode === 'login' ? 'Vytvoriť' : 'Prihlásiť sa'}
                  </ThemedText>
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 100,
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
  },
  socialContainer: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: Spacing.two,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.three,
    fontSize: 16,
  },
  loginBtn: {
    height: 50,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  toggleModeBtn: {
    marginTop: Spacing.five,
    alignItems: 'center',
    padding: Spacing.two,
  }
});
