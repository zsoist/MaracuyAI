import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertFeed } from '../components/AlertFeed';
import { MoodIndicator } from '../components/MoodIndicator';
import { ParakeetCard } from '../components/ParakeetCard';
import { useHomeDashboard } from '../hooks/useHomeDashboard';
import { useStore } from '../store/useStore';
import type { HomeScreenProps } from '../types/navigation';

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { parakeets, latestAnalysis } = useStore();
  const { alerts, refreshing, onRefresh } = useHomeDashboard();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Parakeet Wellness</Text>
        <Text style={styles.subtitle}>Monitor de bienestar para tus periquitos</Text>
      </View>

      {latestAnalysis && (
        <View style={styles.latestCard}>
          <Text style={styles.sectionTitle}>Ultimo analisis</Text>
          <MoodIndicator
            mood={latestAnalysis.mood}
            confidence={latestAnalysis.confidence}
            size="large"
          />
          {latestAnalysis.recommendations && (
            <Text style={styles.recommendation}>{latestAnalysis.recommendations}</Text>
          )}
        </View>
      )}

      <AlertFeed alerts={alerts} />

      <TouchableOpacity
        style={styles.recordButton}
        onPress={() => navigation.navigate('Record')}
      >
        <Text style={styles.recordButtonIcon}>{'\u{1F3A4}'}</Text>
        <Text style={styles.recordButtonText}>Grabar vocalizacion</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis periquitos</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddParakeet')}>
            <Text style={styles.addButton}>+ Agregar</Text>
          </TouchableOpacity>
        </View>

        {parakeets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\u{1F99C}'}</Text>
            <Text style={styles.emptyText}>
              Agrega tu primer periquito para comenzar
            </Text>
          </View>
        ) : (
          parakeets.map((p) => (
            <ParakeetCard
              key={p.id}
              parakeet={p}
              onPress={() => navigation.navigate('ParakeetProfile', { parakeetId: p.id })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#4CAF50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  latestCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendation: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  recordButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  addButton: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
});
