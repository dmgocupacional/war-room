// ═══ BLOCO: SYNC SERVICE ═══
// Drains the offline sync queue when connectivity is restored.
// Called on: app foreground, network reconnect, after each successful op.
// Max 3 retries per operation before discarding.

import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '../store/appStore';
import * as SheetsService from './sheets';
import type { SyncOperation } from '../constants/types';

const MAX_RETRIES = 3;

// ── Check connectivity ──
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

// ── Process one operation ──
async function processOp(sheetsUrl: string, op: SyncOperation): Promise<boolean> {
  try {
    switch (op.action) {
      case 'start_sessao':
        await SheetsService.startSessao(sheetsUrl, op.payload as Parameters<typeof SheetsService.startSessao>[1]);
        return true;
      case 'end_sessao':
        await SheetsService.endSessao(sheetsUrl, op.payload as Parameters<typeof SheetsService.endSessao>[1]);
        return true;
      case 'upsert_etapa': {
        const e = op.payload as Parameters<typeof SheetsService.upsertEtapa>[1];
        await SheetsService.upsertEtapa(sheetsUrl, e);
        return true;
      }
      default:
        console.warn('[sync] unknown action:', op.action);
        return true; // discard unknown
    }
  } catch (err) {
    console.warn('[sync] op failed:', op.action, err);
    return false;
  }
}

// ── Drain queue ──
export async function drainQueue(): Promise<void> {
  const { syncQueue, sheetsUrl, dequeueSync, incrementRetry } = useAppStore.getState();

  if (!sheetsUrl || syncQueue.length === 0) return;

  const online = await isOnline();
  if (!online) return;

  // Process oldest first
  const sorted = [...syncQueue].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const op of sorted) {
    if (op.retries >= MAX_RETRIES) {
      // Give up — discard
      console.warn('[sync] max retries exceeded, discarding:', op.action, op.id);
      dequeueSync(op.id);
      continue;
    }

    const ok = await processOp(sheetsUrl, op);
    if (ok) {
      dequeueSync(op.id);
    } else {
      incrementRetry(op.id);
    }
  }
}

// ── Enqueue a new operation ──
export function enqueue(action: string, payload: Record<string, unknown>): void {
  const op: SyncOperation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  useAppStore.getState().enqueueSync(op);
}
// ── FIM BLOCO ──
