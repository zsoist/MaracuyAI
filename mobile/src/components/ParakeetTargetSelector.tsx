import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Parakeet } from '../types';

interface ParakeetTargetSelectorProps {
  parakeets: Parakeet[];
  selectedParakeetId: string | null;
  onSelect: (id: string | null) => void;
}

export function ParakeetTargetSelector({
  parakeets,
  selectedParakeetId,
  onSelect,
}: ParakeetTargetSelectorProps) {
  if (parakeets.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Analizar para:</Text>
      <View style={styles.chips}>
        <TouchableOpacity
          style={[
            styles.chip,
            selectedParakeetId === null && styles.chipActive,
          ]}
          onPress={() => onSelect(null)}
        >
          <Text
            style={[
              styles.chipText,
              selectedParakeetId === null && styles.chipTextActive,
            ]}
          >
            General
          </Text>
        </TouchableOpacity>
        {parakeets.map((parakeet) => (
          <TouchableOpacity
            key={parakeet.id}
            style={[
              styles.chip,
              selectedParakeetId === parakeet.id && styles.chipActive,
            ]}
            onPress={() => onSelect(parakeet.id)}
          >
            <Text
              style={[
                styles.chipText,
                selectedParakeetId === parakeet.id && styles.chipTextActive,
              ]}
            >
              {parakeet.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#D0D7DE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  chipText: {
    fontSize: 12,
    color: '#455A64',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
});
