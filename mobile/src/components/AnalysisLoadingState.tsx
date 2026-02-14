import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function AnalysisLoadingState() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.text}>Analizando vocalizaciones...</Text>
      <Text style={styles.subtext}>
        Procesando espectrograma y clasificando patrones
      </Text>
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
