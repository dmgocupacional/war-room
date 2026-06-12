// ═══ BLOCO: PROJETOS SCREEN ═══
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import { useSync } from '@/hooks/useSync';
import { Colors, Spacing, FontSize, Radius, statusColor, statusLabel } from '@/constants/theme';
import type { Projeto, Lane } from '@/constants/types';

export default function ProjetosScreen() {
  const insets = useSafeAreaInsets();
  const { lanes, projetos } = useAppStore();
  const { refresh, isLoading } = useSync();

  const ativos = projetos.filter((p) => p.status !== 'Concluído');
  const pctMedio = ativos.length
    ? Math.round(ativos.reduce((s, p) => s + p.pct, 0) / ativos.length)
    : 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 80 },
      ]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={Colors.accent} />}
    >
      <Text style={styles.title}>Projetos</Text>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>{ativos.length}</Text>
          <Text style={styles.kpiLabel}>ativos</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>{pctMedio}%</Text>
          <Text style={styles.kpiLabel}>progresso médio</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>
            {projetos.filter((p) => p.status === 'Concluído').length}
          </Text>
          <Text style={styles.kpiLabel}>concluídos</Text>
        </View>
      </View>

      {/* By lane */}
      {lanes.map((lane) => {
        const ps = projetos.filter((p) => p.laneId === lane.id);
        if (ps.length === 0) return null;
        return (
          <View key={lane.id} style={styles.laneSection}>
            <View style={styles.laneHeader}>
              <View style={[styles.laneDot, { backgroundColor: lane.cor }]} />
              <Text style={styles.laneName}>{lane.nome}</Text>
              <Text style={styles.laneCount}>{ps.length}p</Text>
            </View>
            {ps.map((p) => <ProjetoCard key={p.id} projeto={p} lane={lane} />)}
          </View>
        );
      })}

      {/* Projetos sem lane */}
      {projetos.filter((p) => !lanes.find((l) => l.id === p.laneId)).length > 0 && (
        <View style={styles.laneSection}>
          <Text style={[styles.laneName, { color: Colors.text4 }]}>Sem lane</Text>
          {projetos
            .filter((p) => !lanes.find((l) => l.id === p.laneId))
            .map((p) => <ProjetoCard key={p.id} projeto={p} lane={null} />)}
        </View>
      )}
    </ScrollView>
  );
}

function ProjetoCard({ projeto, lane }: { projeto: Projeto; lane: Lane | null }) {
  const cor = lane?.cor ?? Colors.text4;
  const sc = statusColor(projeto.status);

  const isLate = projeto.fim && new Date(projeto.fim) < new Date() && projeto.pct < 100;
  const daysLeft = projeto.fim
    ? Math.ceil((new Date(projeto.fim).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <View style={[styles.projCard, { borderLeftColor: cor }]}>
      <View style={styles.projTop}>
        <Text style={styles.projNome} numberOfLines={2}>{projeto.nome}</Text>
        <View style={[styles.statusPill, { backgroundColor: sc + '22' }]}>
          <Text style={[styles.statusText, { color: sc }]}>{statusLabel(projeto.status)}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progRow}>
        <View style={styles.progTrack}>
          <View style={[styles.progFill, { width: `${projeto.pct}%`, backgroundColor: cor }]} />
        </View>
        <Text style={styles.progLabel}>{projeto.pct}%</Text>
      </View>

      {/* Footer */}
      <View style={styles.projFooter}>
        {projeto.owner ? (
          <Text style={styles.owner}>{projeto.owner}</Text>
        ) : null}
        {daysLeft !== null && (
          <Text style={[styles.deadline, isLate && styles.deadlineLate]}>
            {isLate
              ? `${Math.abs(daysLeft)}d atrasado`
              : daysLeft === 0
              ? 'Vence hoje'
              : `${daysLeft}d`}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.xl },
  title: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.text },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm },
  kpi: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  kpiVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.accent, fontFamily: 'JetBrains Mono' },
  kpiLabel: { fontSize: FontSize.xs, color: Colors.text3, textAlign: 'center' },
  laneSection: { gap: Spacing.sm },
  laneHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  laneDot: { width: 10, height: 10, borderRadius: 5 },
  laneName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text2, flex: 1 },
  laneCount: { fontSize: FontSize.xs, color: Colors.text4, fontFamily: 'JetBrains Mono' },
  projCard: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  projTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  projNome: { flex: 1, fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progTrack: { flex: 1, height: 5, backgroundColor: Colors.bg5, borderRadius: Radius.full, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: Radius.full },
  progLabel: { fontSize: FontSize.xs, color: Colors.text3, fontFamily: 'JetBrains Mono', minWidth: 32 },
  projFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  owner: { fontSize: FontSize.xs, color: Colors.text4, fontFamily: 'JetBrains Mono' },
  deadline: { fontSize: FontSize.xs, color: Colors.text4, fontFamily: 'JetBrains Mono' },
  deadlineLate: { color: Colors.red },
});
// ── FIM BLOCO ──
