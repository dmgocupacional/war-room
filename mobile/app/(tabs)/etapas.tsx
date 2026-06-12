// ═══ BLOCO: ETAPAS SCREEN ═══
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/appStore';
import { useSync } from '@/hooks/useSync';
import { useTimer } from '@/hooks/useTimer';
import { EtapaCard } from '@/components/EtapaCard';
import { NotaModal } from '@/components/NotaModal';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import type { EtapaComContexto, EtapaStatus } from '@/constants/types';

const FILTERS: { label: string; value: EtapaStatus | 'all' }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Em andamento', value: 'em_andamento' },
  { label: 'Concluída', value: 'concluida' },
];

export default function EtapasScreen() {
  const insets = useSafeAreaInsets();
  const { getEtapasPrioritarias } = useAppStore();
  const { refresh, isLoading } = useSync();
  const timer = useTimer();

  const [filter, setFilter] = useState<EtapaStatus | 'all'>('all');
  const [showNota, setShowNota] = useState(false);
  const [duracaoNota, setDuracaoNota] = useState(0);

  const todas = getEtapasPrioritarias();
  const filtradas =
    filter === 'all' ? todas : todas.filter((e) => e.status === filter);

  const handleStart = (etapa: EtapaComContexto) => {
    if (timer.isRunning) {
      // Stop current and start new
      const sec = timer.elapsedSeconds;
      setDuracaoNota(Math.max(1, Math.round(sec / 60)));
      void timer.stop('');
    }
    timer.start({
      ...etapa,
      projNome: etapa.projeto.nome,
      laneCor: etapa.lane?.cor ?? Colors.accent,
    });
  };

  const handleStop = () => {
    setDuracaoNota(Math.max(1, Math.round(timer.elapsedSeconds / 60)));
    setShowNota(true);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Etapas</Text>
        {timer.isRunning && (
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Text style={styles.stopBtnText}>⏹ {timer.displayTime}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      <Text style={styles.count}>{filtradas.length} etapas</Text>

      {/* List */}
      <FlatList
        data={filtradas}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EtapaCard
            etapa={item}
            isActive={item.id === timer.etapaId}
            onStart={handleStart}
            showScore
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhuma etapa encontrada.</Text>
        }
      />

      {/* Nota modal */}
      <NotaModal
        visible={showNota}
        etapaNome={timer.etapaNome}
        projNome={timer.projNome}
        duracaoMin={duracaoNota}
        onConfirm={async (nota) => {
          setShowNota(false);
          await timer.stop(nota);
        }}
        onSkip={async () => {
          setShowNota(false);
          await timer.stop('');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize['3xl'], fontWeight: '800', color: Colors.text },
  stopBtn: {
    backgroundColor: Colors.redDim,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.red + '44',
  },
  stopBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.red, fontFamily: 'JetBrains Mono' },
  filters: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  chipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text3 },
  chipTextActive: { color: Colors.accent },
  count: {
    fontSize: FontSize.xs,
    color: Colors.text4,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xs,
    fontFamily: 'JetBrains Mono',
  },
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xs },
  empty: {
    textAlign: 'center',
    color: Colors.text4,
    fontSize: FontSize.base,
    marginTop: Spacing['4xl'],
  },
});
// ── FIM BLOCO ──
