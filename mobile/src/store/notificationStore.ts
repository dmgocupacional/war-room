// ═══ BLOCO: NOTIFICATION STORE ═══
// All notification preferences in one place.
// Master switch: enabled. Per-type toggles below.
// Local notifications only (no backend required).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationState {
  // ── Master ──
  enabled: boolean;
  pushToken: string | null;
  permissionGranted: boolean;

  // ── Foco: "você está há Xh sem registrar atividade" ──
  focusEnabled: boolean;
  focusHoras: number;           // hours of inactivity before alert (default 2)

  // ── Briefing diário: "suas 3 prioridades de hoje" ──
  briefingEnabled: boolean;
  briefingHora: number;         // 0-23, default 8

  // ── Resumo semanal: sexta-feira ──
  resumoSemanalEnabled: boolean;
  resumoHora: number;           // 0-23, default 18

  // ── Actions ──
  setEnabled: (v: boolean) => void;
  setPermissionGranted: (v: boolean) => void;
  setPushToken: (token: string | null) => void;
  toggleFocus: () => void;
  setFocusHoras: (h: number) => void;
  toggleBriefing: () => void;
  setBriefingHora: (h: number) => void;
  toggleResumoSemanal: () => void;
  setResumoHora: (h: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      // ── Defaults ──
      enabled: true,
      pushToken: null,
      permissionGranted: false,

      focusEnabled: true,
      focusHoras: 2,

      briefingEnabled: true,
      briefingHora: 8,

      resumoSemanalEnabled: true,
      resumoHora: 18,

      // ── Actions ──
      setEnabled: (v) => set({ enabled: v }),
      setPermissionGranted: (v) => set({ permissionGranted: v }),
      setPushToken: (token) => set({ pushToken: token }),

      toggleFocus: () => set((s) => ({ focusEnabled: !s.focusEnabled })),
      setFocusHoras: (h) => set({ focusHoras: Math.max(1, Math.min(8, h)) }),

      toggleBriefing: () => set((s) => ({ briefingEnabled: !s.briefingEnabled })),
      setBriefingHora: (h) => set({ briefingHora: Math.max(0, Math.min(23, h)) }),

      toggleResumoSemanal: () => set((s) => ({ resumoSemanalEnabled: !s.resumoSemanalEnabled })),
      setResumoHora: (h) => set({ resumoHora: Math.max(0, Math.min(23, h)) }),
    }),
    {
      name: 'war-room-notifications',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
// ── FIM BLOCO ──
