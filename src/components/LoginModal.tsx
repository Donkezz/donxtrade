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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            // Without this the first tap while the keyboard is up only dismisses the keyboard,
            // so the login button needed two taps.
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <ThemedText type="subtitle">{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</ThemedText>
              <Pressable
                onPress={() => setLoginVisible(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.close')}
              >
                <SymbolView tintColor={theme.textSecondary} name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' } as any} size={24} />
              </Pressable>
            </View>

            <View style={styles.content}>
              {/* There is no server yet — be upfront that this is a local demo profile. */}
              <View style={[styles.demoNotice, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                  {t('auth.demoNotice')}
                </ThemedText>
              </View>

              {/* Email / Password */}
              <ThemedText style={{ textAlign: 'center', marginBottom: Spacing.three }} themeColor="textSecondary" type="small">
                {t('auth.useEmail')}
              </ThemedText>

              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />

              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.backgroundSelected }]}
                placeholder={t('auth.passwordPlaceholder')}
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
                  {mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
                </ThemedText>
              </Pressable>

              {/* Toggle Mode */}
              <Pressable 
                style={styles.toggleModeBtn} 
                onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  {mode === 'login' ? `${t('auth.noAccount')} ` : `${t('auth.haveAccount')} `}
                  <ThemedText type="smallBold" themeColor="text">
                    {mode === 'login' ? t('auth.toggleRegister') : t('auth.toggleLogin')}
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
  demoNotice: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.four,
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
