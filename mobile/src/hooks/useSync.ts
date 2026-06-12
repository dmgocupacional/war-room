// ═══ BLOCO: USE SYNC HOOK ═══
// Handles initial load and manual/auto refresh from Sheets.
// Returns: refresh fn, isLoading, lastSyncAt, error.

import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import * as SheetsService from '../services/sheets';
import * as SyncService from '../services/sync';

export function useSync() {
  const { sheetsUrl, setData, setLoading, setSyncError, isLoading, lastSyncAt, syncError } =
    useAppStore();

  const refresh = useCallback(async () => {
    if (!sheetsUrl) return;
    setLoading(true);
    setSyncError(null);
    try {
      const online = await SyncService.isOnline();
      if (!online) {
        setSyncError('Sem conexão — usando dados em cache');
        return;
      }
      const data = await SheetsService.loadAll(sheetsUrl);
      if (!data.ok) {
        setSyncError(data.error ?? 'Erro ao carregar dados');
        return;
      }
      setData({
        lanes: data.lanes,
        projetos: data.projetos,
        etapas: data.etapas,
        evolucoes: data.evolucoes,
        usuarios: data.usuarios,
      });
      // Drain pending queue after successful load
      await SyncService.drainQueue();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de rede';
      setSyncError(msg);
    } finally {
      setLoading(false);
    }
  }, [sheetsUrl, setData, setLoading, setSyncError]);

  return { refresh, isLoading, lastSyncAt, syncError };
}
// ── FIM BLOCO ──
