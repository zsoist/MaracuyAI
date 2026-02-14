import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Alert } from '../services/api';

interface AlertFeedProps {
  alerts: Alert[];
}

export function AlertFeed({ alerts }: AlertFeedProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas recientes</Text>
      {alerts.slice(0, 3).map((alert) => (
        <View
          key={`${alert.created_at}-${alert.parakeet_id ?? 'general'}`}
          style={[
            styles.alertCard,
            alert.priority === 'high' ? styles.alertHigh : styles.alertMedium,
          ]}
        >
          <Text style={styles.alertMessage}>{alert.message}</Text>
          <Text style={styles.alertMeta}>
            {alert.parakeet_name || 'General'} • {new Date(alert.created_at).toLocaleString('es')}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  alertCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  alertHigh: {
    backgroundColor: '#FFF1F1',
    borderColor: '#FFCDD2',
  },
  alertMedium: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE0B2',
  },
  alertMessage: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  alertMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
  },
});
