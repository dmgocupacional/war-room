// ═══ BLOCO: TIMER DISPLAY COMPONENT ═══
// Large animated timer display.
// Shows: HH:MM:SS in mono font, project name, task name, lane color ring.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface TimerDisplayProps {
  displayTime: string;
  etapaNome: string;
  projNome: string;
  laneCor: string;
  isRunning: boolean;
}

export function TimerDisplay({
  displayTime,
  etapaNome,
  projNome,
  laneCor,
  isRunning,
}: TimerDisplayProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.015, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isRunning, pulse]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulse }] }]}>
      {/* Lane color ring */}
      <View style={[styles.ring, { borderColor: laneCor }]}>
        <View style={styles.inner}>
          {/* Pulsing dot */}
          {isRunning && (
            <View style={[styles.runDot, { backgroundColor: laneCor }]} />
          )}

          {/* Timer */}
          <Text style={styles.timeText}>{displayTime}</Text>

          {/* Labels */}
          <Text style={styles.etapaText} numberOfLines={2}>
            {etapaNome || '—'}
          </Text>
          <Text style={styles.projText} numberOfLines={1}>
            {projNome || '—'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg3,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  runDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: Spacing.xs,
  },
  timeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: FontSize['4xl'],
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 2,
  },
  etapaText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text2,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  projText: {
    fontSize: FontSize.sm,
    color: Colors.text3,
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
  },
});
// ── FIM BLOCO ──
