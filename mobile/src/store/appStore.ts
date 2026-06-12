// ═══ BLOCO: APP STORE ═══
// Central store for: user identity, cached Sheets data, sync queue.
// Persisted to AsyncStorage — app works offline with stale data.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Lane,
  Projeto,
  Etapa,
  Evolucao,
  Usuario,
  SyncOperation,
  EtapaComContexto,
} from '../constants/types';

export interface AppState {
  // ── Auth ──
  userEmail: string;
  userName: string;
  userRole: 'admin' | 'user';
  sheetsUrl: string;
  isSetupDone: boolean;

  // ── Cached data from Sheets ──
  lanes: Lane[];
  projetos: Projeto[];
  etapas: Etapa[];
  evolucoes: Evolucao[];
  usuarios: Usuario[];
  lastSyncAt: string | null;

  // ── Sync queue (offline operations waiting to be sent) ──
  syncQueue: SyncOperation[];

  // ── UI state ──
  isLoading: boolean;
  syncError: string | null;

  // ── Computed: sorted priority task ──
  getEtapasPrioritarias: () => EtapaComContexto[];
  getProximaEtapa: () => EtapaComContexto | null;

  // ── Actions ──
  setupUser: (params: { email: string; nome: string; role: 'admin' | 'user'; sheetsUrl: string }) => void;
  setSheetsUrl: (url: string) => void;
  setData: (data: {
    lanes: Lane[];
    projetos: Projeto[];
    etapas: Etapa[];
    evolucoes: Evolucao[];
    usuarios: Usuario[];
  }) => void;
  setLoading: (v: boolean) => void;
  setSyncError: (e: string | null) => void;
  enqueueSync: (op: SyncOperation) => void;
  dequeueSync: (id: string) => void;
  incrementRetry: (id: string) => void;
  logout: () => void;
}

// ── Algoritmo "próxima etapa" ──
// Score = deadline pressure (0-40) + incompletude do projeto (0-30)
//       + status em_andamento (+10) + projeto Em andamento (+10) + peso (+10)
function calcularScore(etapa: Etapa, proj: Projeto): number {
  let score = 0;

  if (proj.fim) {
    const daysLeft = Math.ceil(
      (new Date(proj.fim).getTime() - Date.now()) / 86_400_000
    );
    if (daysLeft <= 0)  score += 40;  // already overdue
    else if (daysLeft <= 3)  score += 35;
    else if (daysLeft <= 7)  score += 28;
    else if (daysLeft <= 14) score += 18;
    else score += 8;
  }

  score += Math.round((1 - Math.min(proj.pct, 100) / 100) * 30);

  if (proj.status === 'Em andamento')  score += 10;
  if (etapa.status === 'em_andamento') score += 10;
  score += Math.min(etapa.peso ?? 0, 10);

  return score;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Auth ──
      userEmail: '',
      userName: '',
      userRole: 'user',
      sheetsUrl: '',
      isSetupDone: false,

      // ── Data ──
      lanes: [],
      projetos: [],
      etapas: [],
      evolucoes: [],
      usuarios: [],
      lastSyncAt: null,

      // ── Sync ──
      syncQueue: [],

      // ── UI ──
      isLoading: false,
      syncError: null,

      // ── Computed ──
      getEtapasPrioritarias: () => {
        const { etapas, projetos, lanes, userEmail } = get();
        const ativas = etapas.filter(
          (e) => e.status === 'pendente' || e.status === 'em_andamento'
        );
        return ativas
          .map((e): EtapaComContexto | null => {
            const proj = projetos.find((p) => p.id === e.projId);
            if (!proj) return null;
            if (proj.status === 'Concluído' || proj.status === 'Pausado') return null;
            const lane = lanes.find((l) => l.id === proj.laneId) ?? null;
            const scoreProxima = calcularScore(e, proj);
            return { ...e, projeto: proj, lane, scoreProxima };
          })
          .filter((e): e is EtapaComContexto => e !== null)
          .sort((a, b) => b.scoreProxima - a.scoreProxima);
      },

      getProximaEtapa: () => {
        const arr = get().getEtapasPrioritarias();
        return arr[0] ?? null;
      },

      // ── Actions ──
      setupUser: ({ email, nome, role, sheetsUrl }) =>
        set({ userEmail: email, userName: nome, userRole: role, sheetsUrl, isSetupDone: true }),

      setSheetsUrl: (url) => set({ sheetsUrl: url }),

      setData: ({ lanes, projetos, etapas, evolucoes, usuarios }) =>
        set({ lanes, projetos, etapas, evolucoes, usuarios, lastSyncAt: new Date().toISOString(), syncError: null }),

      setLoading: (v) => set({ isLoading: v }),

      setSyncError: (e) => set({ syncError: e }),

      enqueueSync: (op) =>
        set((state) => ({ syncQueue: [...state.syncQueue, op] })),

      dequeueSync: (id) =>
        set((state) => ({ syncQueue: state.syncQueue.filter((o) => o.id !== id) })),

      incrementRetry: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((o) =>
            o.id === id ? { ...o, retries: o.retries + 1 } : o
          ),
        })),

      logout: () =>
        set({
          userEmail: '',
          userName: '',
          userRole: 'user',
          sheetsUrl: '',
          isSetupDone: false,
        }),
    }),
    {
      name: 'war-room-app',
      storage: createJSONStorage(() => AsyncStorage),
      // Do NOT persist isLoading or syncError — always reset on boot
      partialize: (state) => ({
        userEmail: state.userEmail,
        userName: state.userName,
        userRole: state.userRole,
        sheetsUrl: state.sheetsUrl,
        isSetupDone: state.isSetupDone,
        lanes: state.lanes,
        projetos: state.projetos,
        etapas: state.etapas,
        evolucoes: state.evolucoes,
        usuarios: state.usuarios,
        lastSyncAt: state.lastSyncAt,
        syncQueue: state.syncQueue,
      }),
    }
  )
);
// ── FIM BLOCO ──
