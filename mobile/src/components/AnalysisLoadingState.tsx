import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n/useI18n';

export function AnalysisLoadingState() {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>{t('analysisLoadingTitle')}</Text>
      <Text style={styles.subtext}>{t('analysisLoadingSubtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  subtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
});
