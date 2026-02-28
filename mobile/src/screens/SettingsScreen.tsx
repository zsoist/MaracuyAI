import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { TipBanner } from '../components/TipBanner';
import { FEATURES } from '../config/env';
import { useI18n } from '../i18n/useI18n';
import type { LanguageCode } from '../i18n/types';
import * as api from '../services/api';
import { useStore } from '../store/useStore';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { SettingsScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errorMessage';

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { t, language, setLanguage } = useI18n();
  const { user, setUser, setParakeets, setRecordings } = useStore();

  const [loadingHabitat, setLoadingHabitat] = useState(false);
  const [savingHabitat, setSavingHabitat] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [latitudeText, setLatitudeText] = useState('');
  const [longitudeText, setLongitudeText] = useState('');
  const [timezoneName, setTimezoneName] = useState('UTC');
  const [habitatType, setHabitatType] = useState('urban');

  useEffect(() => {
    if (!FEATURES.contextEngine) {
      return;
    }
    void loadHabitatProfile();
  }, []);

  const loadHabitatProfile = async () => {
    setLoadingHabitat(true);
    try {
      const profile = await api.getHabitatProfile();
      if (!profile) {
        return;
      }
      setLocationName(profile.location_name || '');
      setLatitudeText(profile.latitude !== null ? String(profile.latitude) : '');
      setLongitudeText(profile.longitude !== null ? String(profile.longitude) : '');
      setTimezoneName(profile.timezone_name || 'UTC');
      setHabitatType(profile.habitat_type || 'urban');
    } catch (error) {
      Alert.alert(t('commonError'), getErrorMessage(error, t('errorLoadHabitat')));
    } finally {
      setLoadingHabitat(false);
    }
  };

  const handleSaveHabitat = async () => {
    const lat = latitudeText.trim().length > 0 ? Number(latitudeText) : null;
    const lon = longitudeText.trim().length > 0 ? Number(longitudeText) : null;
    if ((lat !== null && Number.isNaN(lat)) || (lon !== null && Number.isNaN(lon))) {
      Alert.alert(t('commonError'), t('warningInvalidCoordinates'));
      return;
    }
    if ((lat === null) !== (lon === null)) {
      Alert.alert(t('commonError'), t('warningIncompleteCoordinates'));
      return;
    }

    setSavingHabitat(true);
    try {
      await api.upsertHabitatProfile({
        name: 'Home habitat',
        latitude: lat,
        longitude: lon,
        location_name: locationName.trim() || null,
        timezone_name: timezoneName.trim() || 'UTC',
        habitat_type: habitatType.trim() || 'urban',
      });
      if (lat !== null && lon !== null) {
        await api.refreshContext();
        Alert.alert(t('commonSave'), t('settingsHabitatSavedWithRefresh'));
      } else {
        Alert.alert(t('commonSave'), t('settingsHabitatSavedNoCoords'));
      }
    } catch (error) {
      Alert.alert(t('commonError'), getErrorMessage(error, t('errorSaveHabitat')));
    } finally {
      setSavingHabitat(false);
    }
  };

  const handleLanguageSelect = async (nextLanguage: LanguageCode) => {
    await setLanguage(nextLanguage);
  };

  const handleLogout = async () => {
    Alert.alert(t('settingsLogoutTitle'), t('settingsLogoutConfirm'), [
      { text: t('commonCancel'), style: 'cancel' },
      {
        text: t('settingsLogout'),
        style: 'destructive',
        onPress: async () => {
          await api.logout();
          setUser(null);
          setParakeets([]);
          setRecordings([]);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settingsDeleteAccountTitle'), t('settingsDeleteAccountConfirm'), [
      { text: t('commonCancel'), style: 'cancel' },
      {
        text: t('settingsDeleteAccount'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAccount();
            await api.logout();
            setUser(null);
            setParakeets([]);
            setRecordings([]);
            Alert.alert(t('commonSave'), t('settingsDeleteAccountSuccess'));
          } catch (error) {
            Alert.alert(t('commonError'), getErrorMessage(error, t('errorGeneric')));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TipBanner text={t('tipHowToSettings')} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settingsSectionAccount')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settingsMode')}</Text>
          <Text style={styles.infoValue}>{user ? t('settingsModeAccount') : t('settingsModeGuest')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settingsEmail')}</Text>
          <Text style={styles.infoValue}>{user?.email || t('settingsEmailGuest')}</Text>
        </View>
        {user?.display_name && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('settingsName')}</Text>
            <Text style={styles.infoValue}>{user.display_name}</Text>
          </View>
        )}
        {!user && (
          <TouchableOpacity style={styles.accountButton} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.accountButtonText}>{t('settingsAuthCta')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settingsLanguageSection')}</Text>
        <Text style={styles.infoLabel}>{t('settingsLanguageLabel')}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={[styles.languageChip, language === 'es' && styles.languageChipActive]}
            onPress={() => void handleLanguageSelect('es')}
          >
            <Text style={[styles.languageChipText, language === 'es' && styles.languageChipTextActive]}>
              {t('settingsLanguageEs')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.languageChip, language === 'en' && styles.languageChipActive]}
            onPress={() => void handleLanguageSelect('en')}
          >
            <Text style={[styles.languageChipText, language === 'en' && styles.languageChipTextActive]}>
              {t('settingsLanguageEn')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {FEATURES.contextEngine && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settingsSectionHabitat')}</Text>
          {loadingHabitat ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder={t('settingsLocationNamePlaceholder')}
                value={locationName}
                onChangeText={setLocationName}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder={t('settingsLatitudePlaceholder')}
                  value={latitudeText}
                  onChangeText={setLatitudeText}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder={t('settingsLongitudePlaceholder')}
                  value={longitudeText}
                  onChangeText={setLongitudeText}
                  keyboardType="decimal-pad"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('settingsTimezonePlaceholder')}
                value={timezoneName}
                onChangeText={setTimezoneName}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('settingsHabitatTypePlaceholder')}
                value={habitatType}
                onChangeText={setHabitatType}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.primaryButton, savingHabitat && styles.buttonDisabled]}
                onPress={() => void handleSaveHabitat()}
                disabled={savingHabitat}
              >
                {savingHabitat ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('settingsSaveHabitat')}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settingsSectionAbout')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settingsVersion')}</Text>
          <Text style={styles.infoValue}>0.3.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settingsModel')}</Text>
          <Text style={styles.infoValue}>{t('settingsModelValue')}</Text>
        </View>
      </View>

      {user && (
        <>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t('settingsLogout')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteAccountText}>{t('settingsDeleteAccount')}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.section,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  infoLabel: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  accountButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  accountButtonText: {
    color: '#fff',
    fontSize: typography.caption,
    fontWeight: '700',
  },
  languageRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  languageChip: {
    flex: 1,
    borderRadius: radius.round,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  languageChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  languageChipText: {
    fontSize: typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  languageChipTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.caption,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    columnGap: spacing.sm,
  },
  inputHalf: {
    flex: 1,
  },
  primaryButton: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: typography.caption,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    fontSize: typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
  deleteAccountButton: {
    backgroundColor: '#FFF5F5',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteAccountText: {
    fontSize: typography.caption,
    color: '#B91C1C',
    fontWeight: '700',
  },
});
