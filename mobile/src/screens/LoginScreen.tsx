import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useI18n } from '../i18n/useI18n';
import * as api from '../services/api';
import { useStore } from '../store/useStore';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { AuthScreenProps } from '../types/navigation';

export function LoginScreen({ navigation }: AuthScreenProps) {
  const { t } = useI18n();
  const { setUser } = useStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('commonError'), t('authRequiredFields'));
      return;
    }
    if (!isLogin && password.length < 6) {
      Alert.alert(t('commonError'), t('authPasswordShort'));
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await api.login(email.trim(), password);
      } else {
        await api.register(email.trim(), password, displayName.trim() || undefined);
      }
      const user = await api.getMe();
      await api.mergeGuestData().catch(() => undefined);
      setUser(user);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (err: unknown) {
      const message =
        (typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
            'string' &&
          (err as { response?: { data?: { detail?: string } } }).response?.data?.detail) ||
        t('errorGeneric');
      Alert.alert(t('commonError'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>{'🦜'}</Text>
        <Text style={styles.title}>{t('loginTitle')}</Text>
        <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.tabActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>{t('loginTabSignIn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.tabActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>{t('loginTabRegister')}</Text>
          </TouchableOpacity>
        </View>

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder={t('loginNamePlaceholder')}
            placeholderTextColor="#999"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={styles.input}
          placeholder={t('loginEmailPlaceholder')}
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder={t('loginPasswordPlaceholder')}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? t('loginSubmitSignIn') : t('loginSubmitRegister')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: typography.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  form: {
    padding: spacing.xxl,
    marginTop: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    borderRadius: radius.md,
    marginBottom: spacing.xl,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: typography.caption,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: typography.body,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.body,
    fontWeight: '700',
  },
});
