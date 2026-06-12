// ═══ BLOCO: SHEETS SERVICE ═══
// Wrapper for Apps Script Web App API.
// All calls go through _post() / _get() which handle timeout + error.
// Never call fetch directly outside this module.

import type { SheetsLoadResponse, SessaoTrabalho, Etapa } from '../constants/types';

const TIMEOUT_MS = 12_000;

// ── Low-level fetch with timeout ──
async function _get(url: string): Promise<unknown> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(tid);
  }
}

async function _post(url: string, action: string, payload: Record<string, unknown>): Promise<unknown> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(tid);
  }
}

// ── Public API ──

export async function loadAll(sheetsUrl: string): Promise<SheetsLoadResponse> {
  if (!sheetsUrl) throw new Error('sheetsUrl not configured');
  const data = await _get(`${sheetsUrl}?action=load`);
  return data as SheetsLoadResponse;
}

export async function ping(sheetsUrl: string): Promise<boolean> {
  try {
    const data = await _get(`${sheetsUrl}?action=ping`) as { ok?: boolean };
    return data?.ok === true;
  } catch {
    return false;
  }
}

export async function startSessao(sheetsUrl: string, sessao: Omit<SessaoTrabalho, 'fim_iso' | 'duracao_min'>): Promise<void> {
  await _post(sheetsUrl, 'start_sessao', {
    id: sessao.id,
    etapa_id: sessao.etapa_id,
    proj_id: sessao.proj_id,
    user_email: sessao.user_email,
    inicio_iso: sessao.inicio_iso,
    nota: sessao.nota,
    dispositivo: 'mobile',
  });
}

export async function endSessao(
  sheetsUrl: string,
  params: { id: string; fim_iso: string; duracao_min: number; nota: string }
): Promise<void> {
  await _post(sheetsUrl, 'end_sessao', params);
}

export async function getSessoesHoje(sheetsUrl: string, userEmail: string): Promise<SessaoTrabalho[]> {
  const data = await _get(`${sheetsUrl}?action=get_sessoes_hoje&email=${encodeURIComponent(userEmail)}`);
  return (data as { sessoes?: SessaoTrabalho[] }).sessoes ?? [];
}

export async function upsertEtapa(sheetsUrl: string, etapa: Etapa): Promise<void> {
  await _post(sheetsUrl, 'upsert_etapa', {
    id: etapa.id,
    proj_id: etapa.projId,
    nome: etapa.nome,
    peso: etapa.peso,
    status: etapa.status,
    data_fim: etapa.dataFim,
    automacao_id: etapa.automacaoId,
    ordem: etapa.ordem,
  });
}
// ── FIM BLOCO ──
