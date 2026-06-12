// ═══ BLOCO: TIMER STORE ═══
// Persisted to AsyncStorage. Survives app kill.
// Strategy: store inicioIso as ISO string → recalculate on resume.
// duracaoAcumuladaMin holds time from completed pauses.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TimerState {
  isRunning: boolean;
  etapaId: number | null;
  projId: number | null;
  etapaNome: string;
  projNome: string;
  laneCor: string;
  inicioIso: string | null;           // When current run started (ISO string)
  duracaoAcumuladaMin: number;        // Accumulated from past pauses in this session
  sessaoId: string | null;            // UUID sent to Sheets on start

  // Actions
  startTimer: (params: {
    etapaId: number;
    projId: number;
    etapaNome: string;
    projNome: string;
    laneCor: string;
    sessaoId: string;
  }) => void;
  pauseTimer: (duracaoExtraMin: number) => void;
  stopTimer: () => void;
  resetTimer: () => void;
  getElapsedSeconds: () => number;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      etapaId: null,
      projId: null,
      etapaNome: '',
      projNome: '',
      laneCor: '#4F7CFF',
      inicioIso: null,
      duracaoAcumuladaMin: 0,
      sessaoId: null,

      startTimer: ({ etapaId, projId, etapaNome, projNome, laneCor, sessaoId }) =>
        set({
          isRunning: true,
          etapaId,
          projId,
          etapaNome,
          projNome,
          laneCor,
          inicioIso: new Date().toISOString(),
          duracaoAcumuladaMin: 0,
          sessaoId,
        }),

      pauseTimer: (duracaoExtraMin: number) =>
        set((state) => ({
          isRunning: false,
          inicioIso: null,
          duracaoAcumuladaMin: state.duracaoAcumuladaMin + duracaoExtraMin,
        })),

      stopTimer: () =>
        set({
          isRunning: false,
          etapaId: null,
          projId: null,
          etapaNome: '',
          projNome: '',
          laneCor: '#4F7CFF',
          inicioIso: null,
          duracaoAcumuladaMin: 0,
          sessaoId: null,
        }),

      resetTimer: () =>
        set({
          isRunning: false,
          etapaId: null,
          projId: null,
          etapaNome: '',
          projNome: '',
          laneCor: '#4F7CFF',
          inicioIso: null,
          duracaoAcumuladaMin: 0,
          sessaoId: null,
        }),

      // Calculates total elapsed seconds including current run
      // Safe to call even when app was killed — recalculates from stored ISO
      getElapsedSeconds: () => {
        const { isRunning, inicioIso, duracaoAcumuladaMin } = get();
        const accumulated = duracaoAcumuladaMin * 60;

        if (!isRunning || !inicioIso) {
          return accumulated;
        }

        const startMs = new Date(inicioIso).getTime();
        const nowMs = Date.now();
        const currentRunSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        return accumulated + currentRunSeconds;
      },
    }),
    {
      name: 'war-room-timer',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
// ── FIM BLOCO ──
