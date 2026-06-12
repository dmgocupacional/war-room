// ═══ BLOCO: STREAK STORE ═══
// Tracks consecutive days of activity.
// A day counts if at least one session was completed (duracao_min >= 1).

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;   // YYYY-MM-DD
  totalDias: number;
  totalMinutos: number;

  // ── Actions ──
  registerActivity: (minutosAdded: number) => void;
  reset: () => void;
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalDias: 0,
      totalMinutos: 0,

      registerActivity: (minutosAdded: number) => {
        const { lastActiveDate, currentStreak, longestStreak, totalDias, totalMinutos } = get();
        const today = todayStr();

        let newStreak = currentStreak;
        let newTotalDias = totalDias;

        if (lastActiveDate === today) {
          // Same day — just add minutes, streak unchanged
        } else if (lastActiveDate === yesterdayStr()) {
          // Consecutive day — extend streak
          newStreak += 1;
          newTotalDias += 1;
        } else {
          // Gap or first ever — reset streak to 1
          newStreak = 1;
          newTotalDias += 1;
        }

        set({
          currentStreak: newStreak,
          longestStreak: Math.max(longestStreak, newStreak),
          lastActiveDate: today,
          totalDias: newTotalDias,
          totalMinutos: totalMinutos + minutosAdded,
        });
      },

      reset: () =>
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastActiveDate: null,
          totalDias: 0,
          totalMinutos: 0,
        }),
    }),
    {
      name: 'war-room-streak',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
// ── FIM BLOCO ──
