// ═══ BLOCO: USE TIMER HOOK ═══
// Provides: formatted display time, live elapsed seconds, start/pause/stop.
// Tick recalculates from inicioIso every second — survives app kill.
// On stop: writes to sync queue, triggers focus notification.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTimerStore } from '../store/timerStore';
import { useAppStore } from '../store/appStore';
import { useStreakStore } from '../store/streakStore';
import * as SyncService from '../services/sync';
import * as NotifService from '../services/notifications';
import type { Etapa } from '../constants/types';

// ── Format seconds → "HH:MM:SS" ──
export function formatSeconds(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface UseTimerReturn {
  isRunning: boolean;
  elapsedSeconds: number;
  displayTime: string;
  etapaNome: string;
  projNome: string;
  laneCor: string;
  etapaId: number | null;
  start: (etapa: Etapa & { projNome: string; laneCor: string }) => void;
  pause: () => void;
  stop: (nota?: string) => Promise<void>;
}

export function useTimer(): UseTimerReturn {
  const store = useTimerStore();
  const { userEmail, sheetsUrl } = useAppStore.getState();
  const { registerActivity } = useStreakStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(() => store.getElapsedSeconds());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Tick ──
  useEffect(() => {
    if (store.isRunning) {
      tickRef.current = setInterval(() => {
        setElapsedSeconds(store.getElapsedSeconds());
      }, 1000);
    } else {
      setElapsedSeconds(store.getElapsedSeconds());
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [store.isRunning, store.inicioIso]);

  // ── Start ──
  const start = useCallback(
    (etapa: Etapa & { projNome: string; laneCor: string }) => {
      const sessaoId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      store.startTimer({
        etapaId: etapa.id,
        projId: etapa.projId,
        etapaNome: etapa.nome,
        projNome: etapa.projNome,
        laneCor: etapa.laneCor,
        sessaoId,
      });

      // Cancel focus alert (user is active)
      NotifService.cancelFocusAlert();

      // Optimistically enqueue start_sessao
      SyncService.enqueue('start_sessao', {
        id: sessaoId,
        etapa_id: etapa.id,
        proj_id: etapa.projId,
        user_email: userEmail,
        inicio_iso: new Date().toISOString(),
        nota: '',
        dispositivo: 'mobile',
      });

      // Drain queue if online
      void SyncService.drainQueue();
    },
    [store, userEmail]
  );

  // ── Pause ──
  const pause = useCallback(() => {
    const sec = store.getElapsedSeconds();
    const extraMin = Math.floor(
      store.isRunning && store.inicioIso
        ? (Date.now() - new Date(store.inicioIso).getTime()) / 60_000
        : 0
    );
    store.pauseTimer(extraMin);

    // Schedule focus alert
    void NotifService.scheduleFocusAlert();
  }, [store]);

  // ── Stop ──
  const stop = useCallback(
    async (nota = '') => {
      const sec = store.getElapsedSeconds();
      const duraMin = Math.max(1, Math.round(sec / 60));
      const sessaoId = store.sessaoId;
      const fimIso = new Date().toISOString();

      registerActivity(duraMin);
      store.stopTimer();

      if (sessaoId) {
        SyncService.enqueue('end_sessao', {
          id: sessaoId,
          fim_iso: fimIso,
          duracao_min: duraMin,
          nota,
        });
        void SyncService.drainQueue();
      }

      // Schedule focus alert
      void NotifService.scheduleFocusAlert();
    },
    [store, registerActivity]
  );

  return {
    isRunning: store.isRunning,
    elapsedSeconds,
    displayTime: formatSeconds(elapsedSeconds),
    etapaNome: store.etapaNome,
    projNome: store.projNome,
    laneCor: store.laneCor,
    etapaId: store.etapaId,
    start,
    pause,
    stop,
  };
}
// ── FIM BLOCO ──
