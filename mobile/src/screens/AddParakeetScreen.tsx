import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import type { AddParakeetScreenProps } from '../types/navigation';

export function AddParakeetScreen({ navigation }: AddParakeetScreenProps) {
  const { t } = useI18n();
  const { addParakeet } = useStore();
  const [name, setName] = useState('');
  const [colorDescription, setColorDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('commonError'), t('warningParakeetNameRequired'));
      return;
    }

    setLoading(true);
    try {
      const parakeet = await api.createParakeet({
        name: name.trim(),
        color_description: colorDescription.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      addParakeet(parakeet);
      navigation.goBack();
    } catch (err: unknown) {
      const message =
        (typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
            'string' &&
          (err as { response?: { data?: { detail?: string } } }).response?.data?.detail) ||
        t('errorCreateParakeet');
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{'🦜'}</Text>
          <Text style={styles.title}>{t('addParakeetTitle')}</Text>
        </View>

        <Text style={styles.label}>{t('addParakeetNameLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('addParakeetNamePlaceholder')}
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={styles.label}>{t('addParakeetColorLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('addParakeetColorPlaceholder')}
          placeholderTextColor="#999"
          value={colorDescription}
          onChangeText={setColorDescription}
        />

        <Text style={styles.label}>{t('addParakeetNotesLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('addParakeetNotesPlaceholder')}
          placeholderTextColor="#999"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{t('addParakeetSave')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    marginTop: spacing.sm,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: spacing.lg,
    fontSize: typography.body,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: typography.body,
    fontWeight: '700',
  },
});
