// ═══ BLOCO: DOMAIN TYPES ═══
// Mirrors exactly the schema in Code.gs + new SESSOES_TRABALHO entity.
// All types derived from Sheets columns — never assume shape from memory.

// ── Entidades Sheets ──
export interface Lane {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

export interface Projeto {
  id: number;
  laneId: number;
  nome: string;
  status: ProjetoStatus;
  inicio: string;   // YYYY-MM-DD
  fim: string;      // YYYY-MM-DD
  pct: number;      // 0-100
  detalhe: string;
  owner: string;
}

export type ProjetoStatus =
  | 'Em andamento'
  | 'Planejado'
  | 'Concluído'
  | 'Pausado'
  | 'Em risco';

export interface Etapa {
  id: number;
  projId: number;
  nome: string;
  peso: number;
  status: EtapaStatus;
  dataFim: string;
  automacaoId: string;
  ordem: number;
}

export type EtapaStatus = 'pendente' | 'em_andamento' | 'concluida' | 'bloqueada';

export interface Evolucao {
  id: number;
  projId: number;
  data: string;
  pct: number;
  nota: string;
}

export interface Usuario {
  email: string;
  nome: string;
  role: 'admin' | 'user';
  ativo: boolean;
}

// ── Nova entidade: SESSOES_TRABALHO ──
export interface SessaoTrabalho {
  id: string;             // UUID gerado no cliente
  etapa_id: number;
  proj_id: number;
  user_email: string;
  inicio_iso: string;     // ISO 8601
  fim_iso: string | null; // null = em andamento
  duracao_min: number;    // calculado ao encerrar
  nota: string;           // pode ser vazio
  dispositivo: 'mobile' | 'web';
}

// ── Resposta do Apps Script ──
export interface SheetsLoadResponse {
  ok: boolean;
  lanes: Lane[];
  projetos: Projeto[];
  evolucoes: Evolucao[];
  etapas: Etapa[];
  usuarios: Usuario[];
  nextProjId: number;
  nextLaneId: number;
  nextEtapaId: number;
  error?: string;
}

// ── Operação na fila offline ──
export interface SyncOperation {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

// ── Etapa com contexto do projeto (para UI) ──
export interface EtapaComContexto extends Etapa {
  projeto: Projeto;
  lane: Lane | null;
  scoreProxima: number;
}
// ── FIM BLOCO ──
