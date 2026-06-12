// ═══ BLOCO: STREAK BADGE COMPONENT ═══
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';
import { useStreakStore } from '../store/streakStore';

export function StreakBadge() {
  const { currentStreak, totalMinutos } = useStreakStore();
  if (currentStreak === 0) return null;

  const h = Math.floor(totalMinutos / 60);
  const emoji = currentStreak >= 30 ? '🏆' : currentStreak >= 7 ? '🔥' : '⚡';

  return (
    <View style={styles.badge}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.streak}>{currentStreak}d</Text>
      <Text style={styles.divider}>·</Text>
      <Text style={styles.horas}>{h}h total</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.amberDim,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  emoji: { fontSize: FontSize.base },
  streak: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.amber,
    fontFamily: 'JetBrains Mono',
  },
  divider: { color: Colors.text4, fontSize: FontSize.sm },
  horas: {
    fontSize: FontSize.xs,
    color: Colors.text3,
    fontFamily: 'JetBrains Mono',
  },
});
// ── FIM BLOCO ──
