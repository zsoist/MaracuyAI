import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MoodType } from '../types';
import { MOOD_CONFIG } from '../store/useStore';

interface MoodIndicatorProps {
  mood: MoodType;
  confidence: number;
  size?: 'small' | 'large';
}

export function MoodIndicator({ mood, confidence, size = 'small' }: MoodIndicatorProps) {
  const config = MOOD_CONFIG[mood];
  const isLarge = size === 'large';

  return (
    <View style={[styles.container, isLarge && styles.containerLarge]}>
      <View
        style={[
          styles.circle,
          isLarge && styles.circleLarge,
          { backgroundColor: config.color },
        ]}
      >
        <Text style={[styles.emoji, isLarge && styles.emojiLarge]}>
          {getMoodEmoji(mood)}
        </Text>
      </View>
      <Text style={[styles.label, isLarge && styles.labelLarge, { color: config.color }]}>
        {config.label}
      </Text>
      <Text style={[styles.confidence, isLarge && styles.confidenceLarge]}>
        {Math.round(confidence * 100)}% confianza
      </Text>
    </View>
  );
}

function getMoodEmoji(mood: MoodType): string {
  const emojis: Record<MoodType, string> = {
    happy: '\u{1F99C}',
    relaxed: '\u{1F54A}',
    stressed: '\u{26A0}',
    scared: '\u{1F628}',
    sick: '\u{1FA7A}',
    neutral: '\u{1F426}',
  };
  return emojis[mood];
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 8,
  },
  containerLarge: {
    padding: 20,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emoji: {
    fontSize: 24,
  },
  emojiLarge: {
    fontSize: 48,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  labelLarge: {
    fontSize: 22,
    marginTop: 12,
  },
  confidence: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  confidenceLarge: {
    fontSize: 14,
    marginTop: 4,
  },
});
