// ═══ BLOCO: HOJE SCREEN ═══
// Shows today's work sessions as a visual timeline.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import * as SheetsService from '@/services/sheets';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import type { SessaoTrabalho } from '@/constants/types';
import { formatSeconds } from '@/hooks/useTimer';

export default function HojeScreen() {
  const insets = useSafeAreaInsets();
  const { sheetsUrl, userEmail, etapas, projetos } = useAppStore();
  const [sessoes, setSessoes] = useState<SessaoTrabalho[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sheetsUrl) return;
    setLoading(true);
    SheetsService.getSessoesHoje(sheetsUrl, userEmail)
      .then(setSessoes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sheetsUrl, userEmail]);

  const totalMin = sessoes.reduce((s, sess) => s + (sess.duracao_min ?? 0), 0);
  const totalSec = totalMin * 60;

  const etapasHoje = Array.from(new Set(sessoes.map((s) => s.etapa_id)));
  const projsHoje = Array.from(new Set(sessoes.map((s) => s.proj_id)));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 80 },
      ]}
    >
      {/* Header */}
      <Text style={styles.title}>Hoje</Text>
      <Text style={styles.date}>
        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
      </Text>

      {/* KPIs */}
      <View style={styles.kpiRow}>
        <KpiBox label="Tempo total" value={formatSeconds(totalSec).slice(0, 5)} unit="hh:mm" />
        <KpiBox label="Sessões" value={String(sessoes.length)} unit="sessões" />
        <KpiBox label="Projetos" value={String(projsHoje.length)} unit="projetos" />
      </View>

      {loading && <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />}

      {/* Timeline */}
      {!loading && sessoes.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌅</Text>
          <Text style={styles.emptyText}>Nenhuma sessão registrada hoje.</Text>
          <Text style={styles.emptyHint}>Inicie um timer na aba Agora.</Text>
        </View>
      )}

      {!loading && sessoes.length > 0 && (
        <View style={styles.timeline}>
          <Text style={styles.sectionTitle}>Sessões</Text>
          {sessoes
            .slice()
            .sort((a, b) => new Date(b.inicio_iso).getTime() - new Date(a.inicio_iso).getTime())
            .map((sess) => {
              const etapa = etapas.find((e) => e.id === sess.etapa_id);
              const proj = projetos.find((p) => p.id === sess.proj_id);
              const dur = sess.duracao_min ?? 0;
              const h = Math.floor(dur / 60);
              const m = dur % 60;
              const duracaoStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
              const horaInicio = new Date(sess.inicio_iso).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View key={sess.id} style={styles.sessaoCard}>
                  <View style={styles.sessaoLeft}>
                    <Text style={styles.sessaoHora}>{horaInicio}</Text>
                    <View style={styles.sessaoLine} />
                  </View>
                  <View style={styles.sessaoBody}>
                    <Text style={styles.sessaoEtapa} numberOfLines={1}>
                      {etapa?.nome ?? `Etapa #${sess.etapa_id}`}
                    </Text>
                    <Text style={styles.sessaoProj} numberOfLines={1}>
                      {proj?.nome ?? `Projeto #${sess.proj_id}`}
                    </Text>
                    <View style={styles.sessaoDurRow}>
                      <Text style={styles.sessaoDur}>{duracaoStr}</Text>
                      {sess.nota ? (
                        <Text style={styles.sessaoNota} numberOfLines={1}>
                          {sess.nota}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
        </View>
      )}
    </ScrollView>
  );
}

function KpiBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={kpiStyles.box}>
      <Text style={kpiStyles.val}>{value}</Text>
      <Text style={kpiStyles.unit}>{unit}</Text>
      <Text style={kpiStyles.label}>{label}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  val: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.accent,
    fontFamily: 'JetBrains Mono',
  },
  unit: { fontSize: FontSize.xs, color: Colors.text4, fontFamily: 'JetBrains Mono' },
  label: { fontSize: FontSize.xs, color: Colors.text3, textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.lg },
  title: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.text },
  date: { fontSize: FontSize.sm, color: Colors.text3, fontFamily: 'JetBrains Mono', marginTop: -Spacing.sm },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['4xl'] },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.text2 },
  emptyHint: { fontSize: FontSize.sm, color: Colors.text4 },
  timeline: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1 },
  sessaoCard: { flexDirection: 'row', gap: Spacing.md },
  sessaoLeft: { alignItems: 'center', width: 44 },
  sessaoHora: { fontSize: FontSize.xs, color: Colors.text3, fontFamily: 'JetBrains Mono' },
  sessaoLine: { flex: 1, width: 2, backgroundColor: Colors.border2, marginTop: 4 },
  sessaoBody: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 3,
    marginBottom: Spacing.sm,
  },
  sessaoEtapa: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  sessaoProj: { fontSize: FontSize.xs, color: Colors.text3, fontFamily: 'JetBrains Mono' },
  sessaoDurRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginTop: 2 },
  sessaoDur: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700', fontFamily: 'JetBrains Mono' },
  sessaoNota: { fontSize: FontSize.xs, color: Colors.text4, flex: 1 },
});
// ── FIM BLOCO ──
