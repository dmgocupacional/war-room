// ═══ BLOCO: HOME AGORA SCREEN ═══
// The core screen: active timer + recommended next task + quick launcher.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTimer } from '@/hooks/useTimer';
import { useSync } from '@/hooks/useSync';
import { useAppStore } from '@/store/appStore';
import { TimerDisplay } from '@/components/TimerDisplay';
import { EtapaCard } from '@/components/EtapaCard';
import { NotaModal } from '@/components/NotaModal';
import { StreakBadge } from '@/components/StreakBadge';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';
import type { EtapaComContexto } from '@/constants/types';

export default function AgoraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const timer = useTimer();
  const { refresh, isLoading } = useSync();
  const { getProximaEtapa, getEtapasPrioritarias, userName } = useAppStore();

  const [showNota, setShowNota] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [duracaoParaNota, setDuracaoParaNota] = useState(0);

  const proxima = getProximaEtapa();
  const prioritarias = getEtapasPrioritarias().slice(0, 10);

  // ── Recalculate on app foreground (timer resilience) ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // useTimer tick re-reads getElapsedSeconds() which recalculates from inicioIso
        // No action needed — the interval in useTimer handles it
      }
    });
    return () => sub.remove();
  }, []);

  const handleStart = useCallback(
    (etapa: EtapaComContexto) => {
      // If something is running, stop it first (no nota prompt for auto-switch)
      if (timer.isRunning) {
        void timer.stop('');
      }
      timer.start({
        ...etapa,
        projNome: etapa.projeto.nome,
        laneCor: etapa.lane?.cor ?? Colors.accent,
      });
      setShowPicker(false);
    },
    [timer]
  );

  const handlePause = useCallback(() => {
    timer.pause();
  }, [timer]);

  const handleStop = useCallback(() => {
    const sec = timer.elapsedSeconds;
    setDuracaoParaNota(Math.max(1, Math.round(sec / 60)));
    setShowNota(true);
  }, [timer]);

  const handleNotaConfirm = useCallback(
    async (nota: string) => {
      setShowNota(false);
      await timer.stop(nota);
    },
    [timer]
  );

  const handleNotaSkip = useCallback(async () => {
    setShowNota(false);
    await timer.stop('');
  }, [timer]);

  const activeEtapa = prioritarias.find((e) => e.id === timer.etapaId);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 80 }]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={Colors.accent} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {userName?.split(' ')[0] ?? 'você'} 👋</Text>
          <Text style={styles.subGreeting}>
            {timer.isRunning ? 'Em foco' : 'Pronto para começar?'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <StreakBadge />
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <Text style={styles.settingsBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerSection}>
        <TimerDisplay
          displayTime={timer.displayTime}
          etapaNome={timer.isRunning ? timer.etapaNome : (proxima?.nome ?? 'Nenhuma tarefa ativa')}
          projNome={timer.isRunning ? timer.projNome : (proxima?.projeto.nome ?? '')}
          laneCor={timer.isRunning ? timer.laneCor : (proxima?.lane?.cor ?? Colors.text4)}
          isRunning={timer.isRunning}
        />

        {/* Controls */}
        <View style={styles.controls}>
          {timer.isRunning ? (
            <>
              <TouchableOpacity style={styles.btnPause} onPress={handlePause}>
                <Text style={styles.btnPauseText}>⏸ Pausar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnStop} onPress={handleStop}>
                <Text style={styles.btnStopText}>⏹ Encerrar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Start próxima */}
              {proxima && (
                <TouchableOpacity
                  style={styles.btnStart}
                  onPress={() => handleStart(proxima)}
                >
                  <Text style={styles.btnStartText}>
                    ▶ Iniciar próxima
                  </Text>
                </TouchableOpacity>
              )}

              {/* Resume if paused */}
              {!timer.isRunning && timer.elapsedSeconds > 0 && (
                <TouchableOpacity style={styles.btnResume} onPress={() => {
                  if (activeEtapa) handleStart(activeEtapa);
                }}>
                  <Text style={styles.btnResumeText}>↩ Retomar</Text>
                </TouchableOpacity>
              )}

              {/* Choose another */}
              <TouchableOpacity style={styles.btnChoose} onPress={() => setShowPicker(!showPicker)}>
                <Text style={styles.btnChooseText}>
                  {showPicker ? '▲ Fechar' : '▼ Escolher tarefa'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Task picker */}
      {showPicker && (
        <View style={styles.pickerSection}>
          <Text style={styles.pickerTitle}>Prioridades agora</Text>
          {prioritarias.length === 0 && (
            <Text style={styles.emptyText}>Nenhuma etapa pendente 🎉</Text>
          )}
          {prioritarias.map((e) => (
            <EtapaCard
              key={e.id}
              etapa={e}
              isActive={e.id === timer.etapaId}
              onStart={handleStart}
              showScore
            />
          ))}
        </View>
      )}

      {/* Próxima recomendada (quando não está rodando) */}
      {!timer.isRunning && !showPicker && proxima && (
        <View style={styles.proximaSection}>
          <Text style={styles.pickerTitle}>Recomendada agora ⚡</Text>
          <EtapaCard etapa={proxima} onStart={handleStart} showScore />
        </View>
      )}

      {/* Nota modal */}
      <NotaModal
        visible={showNota}
        etapaNome={timer.etapaNome}
        projNome={timer.projNome}
        duracaoMin={duracaoParaNota}
        onConfirm={handleNotaConfirm}
        onSkip={handleNotaSkip}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  subGreeting: {
    fontSize: FontSize.sm,
    color: Colors.text3,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtnText: { fontSize: 16, color: Colors.text3 },
  timerSection: {
    alignItems: 'center',
    gap: Spacing.xl,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  btnStart: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    minWidth: 160,
    alignItems: 'center',
  },
  btnStartText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  btnPause: {
    backgroundColor: Colors.amberDim,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.amber + '44',
  },
  btnPauseText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.amber,
  },
  btnStop: {
    backgroundColor: Colors.redDim,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.red + '44',
  },
  btnStopText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.red,
  },
  btnResume: {
    backgroundColor: Colors.greenDim,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.green + '44',
  },
  btnResumeText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.green,
  },
  btnChoose: {
    backgroundColor: Colors.bg3,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  btnChooseText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text3,
  },
  pickerSection: { gap: Spacing.sm },
  proximaSection: { gap: Spacing.sm },
  pickerTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyText: {
    fontSize: FontSize.base,
    color: Colors.text4,
    textAlign: 'center',
    padding: Spacing.xl,
  },
});
// ── FIM BLOCO ──
