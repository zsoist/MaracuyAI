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

import { FEATURES } from '../config/env';
import * as api from '../services/api';
import { useStore } from '../store/useStore';
import type { SettingsScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errorMessage';

export function SettingsScreen({ navigation }: SettingsScreenProps) {
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
      Alert.alert('Error', getErrorMessage(error, 'No se pudo cargar habitat.'));
    } finally {
      setLoadingHabitat(false);
    }
  };

  const handleSaveHabitat = async () => {
    const lat = latitudeText.trim().length > 0 ? Number(latitudeText) : null;
    const lon = longitudeText.trim().length > 0 ? Number(longitudeText) : null;
    if ((lat !== null && Number.isNaN(lat)) || (lon !== null && Number.isNaN(lon))) {
      Alert.alert('Datos invalidos', 'Latitude y longitude deben ser numeros validos.');
      return;
    }
    if ((lat === null) !== (lon === null)) {
      Alert.alert('Datos incompletos', 'Debes enviar latitude y longitude juntos.');
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
        Alert.alert('Listo', 'Habitat guardado y contexto actualizado.');
      } else {
        Alert.alert('Listo', 'Habitat guardado. Agrega coordenadas para activar contexto ambiental.');
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo guardar habitat.'));
    } finally {
      setSavingHabitat(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar sesion', 'Estas seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesion',
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Modo</Text>
          <Text style={styles.infoValue}>{user ? 'Con cuenta' : 'Invitado'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'No aplica (invitado)'}</Text>
        </View>
        {user?.display_name && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{user.display_name}</Text>
          </View>
        )}
        {!user && (
          <TouchableOpacity style={styles.accountButton} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.accountButtonText}>Crear cuenta o iniciar sesion</Text>
          </TouchableOpacity>
        )}
      </View>

      {FEATURES.contextEngine && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Habitat y contexto</Text>
          {loadingHabitat ? (
            <ActivityIndicator color="#4CAF50" />
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Nombre ubicacion (ej: Casa)"
                value={locationName}
                onChangeText={setLocationName}
              />
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Latitude"
                  value={latitudeText}
                  onChangeText={setLatitudeText}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, styles.inputHalf]}
                  placeholder="Longitude"
                  value={longitudeText}
                  onChangeText={setLongitudeText}
                  keyboardType="decimal-pad"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Timezone (ej: America/New_York)"
                value={timezoneName}
                onChangeText={setTimezoneName}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Habitat type (urban, suburban, rural)"
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
                  <Text style={styles.primaryButtonText}>Guardar habitat</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>0.2.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Modelo IA</Text>
          <Text style={styles.infoValue}>Heuristico v1 + Quality Layer</Text>
        </View>
      </View>

      {user && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  accountButton: {
    marginTop: 14,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  accountButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    columnGap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
  },
});
