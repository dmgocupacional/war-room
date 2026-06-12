// ═══ BLOCO: ETAPA CARD COMPONENT ═══

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Spacing, FontSize, statusColor, statusLabel } from '../constants/theme';
import type { EtapaComContexto } from '../constants/types';

interface EtapaCardProps {
  etapa: EtapaComContexto;
  isActive?: boolean;
  onStart?: (etapa: EtapaComContexto) => void;
  onPress?: (etapa: EtapaComContexto) => void;
  showScore?: boolean;
}

export function EtapaCard({ etapa, isActive, onStart, onPress, showScore }: EtapaCardProps) {
  const laneCor = etapa.lane?.cor ?? Colors.accent;
  const sColor = statusColor(etapa.status);

  return (
    <TouchableOpacity
      style={[styles.card, isActive && styles.cardActive, { borderLeftColor: laneCor }]}
      onPress={() => onPress?.(etapa)}
      activeOpacity={0.75}
    >
      <View style={styles.top}>
        <View style={styles.labels}>
          {/* Lane + project */}
          <Text style={styles.projLabel} numberOfLines={1}>
            {etapa.lane ? `${etapa.lane.nome}  ›  ` : ''}{etapa.projeto.nome}
          </Text>
          {/* Task name */}
          <Text style={styles.etapaNome} numberOfLines={2}>
            {etapa.nome}
          </Text>
        </View>

        {/* Quick-start button */}
        {onStart && !isActive && (
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: laneCor + '22' }]} onPress={() => onStart(etapa)}>
            <Text style={[styles.startBtnText, { color: laneCor }]}>▶</Text>
          </TouchableOpacity>
        )}
        {isActive && (
          <View style={[styles.activeBadge, { backgroundColor: laneCor + '22' }]}>
            <Text style={[styles.activeBadgeText, { color: laneCor }]}>● Ativo</Text>
          </View>
        )}
      </View>

      <View style={styles.bottom}>
        {/* Status */}
        <View style={[styles.statusPill, { backgroundColor: sColor + '22' }]}>
          <Text style={[styles.statusText, { color: sColor }]}>{statusLabel(etapa.status)}</Text>
        </View>

        {/* Project progress */}
        <View style={styles.progRow}>
          <View style={styles.progTrack}>
            <View style={[styles.progFill, { width: `${etapa.projeto.pct}%`, backgroundColor: laneCor }]} />
          </View>
          <Text style={styles.progLabel}>{etapa.projeto.pct}%</Text>
        </View>

        {/* Priority score */}
        {showScore && (
          <Text style={styles.scoreText}>⚡ {etapa.scoreProxima}pts</Text>
        )}

        {/* Deadline */}
        {etapa.projeto.fim && (
          <Text style={styles.deadlineText}>
            {formatDeadline(etapa.projeto.fim)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function formatDeadline(fim: string): string {
  const d = new Date(fim);
  if (isNaN(d.getTime())) return '';
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0)  return `${Math.abs(days)}d atrasado`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  if (days <= 7)  return `${days}d restantes`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardActive: {
    borderColor: Colors.border3,
    backgroundColor: Colors.bg4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  labels: {
    flex: 1,
    gap: 3,
  },
  projLabel: {
    fontSize: FontSize.xs,
    color: Colors.text3,
    fontFamily: 'JetBrains Mono',
  },
  etapaNome: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  startBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    fontSize: FontSize.md,
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  activeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  progRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  progTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.bg5,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  progLabel: {
    fontSize: FontSize.xs,
    color: Colors.text3,
    fontFamily: 'JetBrains Mono',
    minWidth: 32,
  },
  scoreText: {
    fontSize: FontSize.xs,
    color: Colors.amber,
    fontFamily: 'JetBrains Mono',
  },
  deadlineText: {
    fontSize: FontSize.xs,
    color: Colors.text4,
    fontFamily: 'JetBrains Mono',
  },
});
// ── FIM BLOCO ──
