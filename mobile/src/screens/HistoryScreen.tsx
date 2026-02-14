import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MoodIndicator } from '../components/MoodIndicator';
import { TipBanner } from '../components/TipBanner';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/types';
import * as api from '../services/api';
import { useStore } from '../store/useStore';
import type { AnalysisResult } from '../types';

const VOCALIZATION_LABELS: Record<string, TranslationKey> = {
  singing: 'vocalizationSinging',
  chattering: 'vocalizationChattering',
  alarm: 'vocalizationAlarm',
  silence: 'vocalizationSilence',
  distress: 'vocalizationDistress',
  contact_call: 'vocalizationContactCall',
  beak_grinding: 'vocalizationBeakGrinding',
};

export function HistoryScreen() {
  const { t, formatDateTime } = useI18n();
  const { parakeets } = useStore();
  const [selectedParakeet, setSelectedParakeet] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!selectedParakeet) {
      setAnalyses([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getAnalysisHistory(selectedParakeet);
      setAnalyses(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedParakeet]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (parakeets.length > 0 && !selectedParakeet) {
      setSelectedParakeet(parakeets[0].id);
    }
  }, [parakeets, selectedParakeet]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: AnalysisResult }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
          <MoodIndicator mood={item.mood} confidence={item.confidence} />
          <View style={styles.cardInfo}>
            <Text style={styles.vocType}>
              {t(VOCALIZATION_LABELS[item.vocalization_type] || 'vocalizationUnknown')}
            </Text>
            <Text style={styles.date}>
              {formatDateTime(item.created_at)}
            </Text>
          <Text style={styles.energy}>
            {t('historyEnergy', { value: Math.round(item.energy_level * 100) })}
          </Text>
        </View>
      </View>
      {item.recommendations && (
        <Text style={styles.recommendation} numberOfLines={2}>
          {item.recommendations}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tipWrapper}>
        <TipBanner text={t('tipHowToHistory')} />
      </View>
      <View style={styles.filterRow}>
        {parakeets.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.filterChip, selectedParakeet === p.id && styles.filterChipActive]}
            onPress={() => setSelectedParakeet(p.id)}
          >
            <Text
              style={[
                styles.filterText,
                selectedParakeet === p.id && styles.filterTextActive,
              ]}
            >
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {analyses.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {parakeets.length === 0
              ? t('historyNoParakeets')
              : t('historyNoAnalyses')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={analyses}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  tipWrapper: {
    padding: 16,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vocType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  energy: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  recommendation: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
  },
});
