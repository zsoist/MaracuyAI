import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { toMediaUrl } from '../services/api';
import type { Parakeet } from '../types';

interface ParakeetCardProps {
  parakeet: Parakeet;
  onPress: (parakeet: Parakeet) => void;
  latestMood?: string;
}

export function ParakeetCard({ parakeet, onPress, latestMood }: ParakeetCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(parakeet)}>
      <View style={styles.avatar}>
        {parakeet.photo_url ? (
          <Image
            source={{ uri: toMediaUrl(parakeet.photo_url) }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarText}>{parakeet.name.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{parakeet.name}</Text>
        {parakeet.color_description && (
          <Text style={styles.description}>{parakeet.color_description}</Text>
        )}
        {latestMood && <Text style={styles.mood}>{latestMood}</Text>}
      </View>
      <Text style={styles.arrow}>{'\u203A'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  mood: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 24,
    color: '#ccc',
  },
});
