// ════════════════════════════════════════════════════════════════
//  DATA LAKE — War Room · Henrique Paludo · DIMEG
//  Gerado por: gsheets-datalake skill
//  Data: 12/06/2026
//  Entidades: LANES, PROJETOS, EVOLUCOES
//  Repo: dmgocupacional/gantt-henrique (GitHub Pages)
//
//  COMO DEPLOYAR:
//  1. script.google.com → Novo projeto → cole este código
//  2. Implantar → Nova implantação → Aplicativo da Web
//  3. Executar como: Eu mesmo
//  4. Quem tem acesso: Qualquer pessoa
//  5. Copiar URL → colar no badge "Seed local" do Gantt
// ════════════════════════════════════════════════════════════════

// ═══ BLOCO: CONFIG ═══
const DL_CONFIG = {
  projectName: 'War Room · Henrique Paludo',
  version: '1.0.0',
  createdAt: '12/06/2026',
  sheetColors: {
    raw:        '#FFF3CD',
    staging:    '#D1ECF1',
    marts:      '#D4EDDA',
    config:     '#E2E3E5',
    log:        '#F8D7DA',
    header:     '#1a1a2e',
    headerText: '#FFFFFF',
  }
};
// ── FIM BLOCO ──

// ═══ BLOCO: SCHEMA ═══
const SCHEMA = {
  BUS: [
    'id', 'nome', 'cor', 'ordem'
  ],
  LANES: [
    'id', 'nome', 'cor', 'ordem'
  ],
  PROJETOS: [
    'id', 'lane_id', 'bu_id', 'nome', 'status',
    'inicio', 'fim', 'pct', 'detalhe', 'owner'
  ],
  EVOLUCOES: [
    'id', 'proj_id', 'data', 'pct', 'nota'
  ],
  ETAPAS: [
    'id', 'proj_id', 'nome', 'peso', 'status',
    'data_fim', 'automacao_id', 'ordem', 'responsavel'
  ],
  USUARIOS: [
    'email', 'nome', 'role', 'ativo', 'criado_em',
    'bu_padrao', 'bus_permitidas',
    'senha_hash', 'salt', 'ultimo_login', 'cargo'
  ],
  SESSOES_TRABALHO: [
    'id', 'etapa_id', 'proj_id', 'user_email',
    'inicio_iso', 'fim_iso', 'duracao_min', 'nota', 'dispositivo'
  ],
};
// ── FIM BLOCO ──

// ═══ BLOCO: HTTP HANDLERS ═══
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'load';
  try {
    if (action === 'load')              return jsonOk(handleLoad());
    if (action === 'ping')              return jsonOk({ ok: true, ts: new Date().toISOString() });
    if (action === 'get_sessoes_hoje')  return jsonOk(handleGetSessoesHoje(e.parameter));
    return jsonErr('Unknown GET action: ' + action);
  } catch (err) {
    return jsonErr(err.message);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';
    const payload = body.payload || {};

    // Gate de sessão: só liga quando CONFIG.auth_required = 1.
    // Desligado por padrão para não derrubar o app mobile, que ainda
    // não envia token. Ligue depois de atualizar o mobile.
    if (getConfig('auth_required') === '1' &&
        ['login', 'setup'].indexOf(action) < 0 &&
        !validarToken(payload.token)) {
      return jsonOk({ ok: false, error: 'Sessão expirada — faça login novamente' });
    }

    switch (action) {
      case 'setup':         return jsonOk(handleSetup());
      case 'upsert_lane':   return jsonOk(handleUpsertLane(payload));
      case 'delete_lane':   return jsonOk(handleDeleteLane(payload));
      case 'upsert_proj':   return jsonOk(handleUpsertProj(payload));
      case 'delete_proj':   return jsonOk(handleDeleteProj(payload));
      case 'add_evolucao':  return jsonOk(handleAddEvolucao(payload));
      case 'set_meta':      return jsonOk(handleSetMeta(payload));
      case 'save_all':      return jsonOk(handleSaveAll(payload));
      case 'upsert_usuario': return jsonOk(handleUpsertUsuario(payload));
      case 'delete_usuario': return jsonOk(handleDeleteUsuario(payload));
      case 'login':         return jsonOk(handleLogin(payload));
      case 'set_senha':     return jsonOk(handleSetSenha(payload));
      case 'criar_usuario': return jsonOk(handleCriarUsuario(payload));
      case 'metricas_repo': return jsonOk(handleMetricasRepo(payload));
      case 'upsert_bu':     return jsonOk(handleUpsertBu(payload));
      case 'delete_bu':     return jsonOk(handleDeleteBu(payload));
      case 'set_pref':      return jsonOk(handleSetPref(payload));
      case 'upsert_etapa': return jsonOk(handleUpsertEtapa(payload));
      case 'delete_etapa': return jsonOk(handleDeleteEtapa(payload));
      case 'run_digest':    return jsonOk(handleDigest(payload));
      case 'run_alerta':    return jsonOk(handleAlerta(payload));
      case 'run_marts':     return jsonOk(handleRunMarts(payload));
      case 'run_snapshot':  return jsonOk(handleSnapshot(payload));
      // ── MOBILE: SESSOES_TRABALHO ──
      case 'start_sessao':  return jsonOk(handleStartSessao(payload));
      case 'end_sessao':    return jsonOk(handleEndSessao(payload));
      default:              return jsonErr('Unknown POST action: ' + action);
    }
  } catch (err) {
    log_('ERROR', err.message);
    return jsonErr(err.message);
  }
}
// ── FIM BLOCO ──

// ═══ BLOCO: LOAD ═══
function handleLoad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Setup automático na primeira chamada
  if (!ss.getSheetByName('CONFIG')) handleSetup();

  // Migração idempotente: garante que colunas novas do SCHEMA existam
  // nas abas já criadas (sem perder dado nem reordenar linhas).
  _migrarColunas(ss);

  const lanes     = _readStaging(ss, 'LANES')    .map(_parseLane);
  const projetos  = _readStaging(ss, 'PROJETOS') .map(_parseProj);
  const evolucoes = _readRaw(ss, 'EVOLUCOES')    .map(_parseEvo);

  // Ordena lanes por campo ordem
  lanes.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const nextProjId = parseInt(getConfig('next_proj_id') || '100');
  const nextLaneId = parseInt(getConfig('next_lane_id') || '10');

  const etapas = _readStaging(ss, 'ETAPAS').map(r => ({
    id:_toInt(r['id']), projId:_toInt(r['proj_id']), nome:String(r['nome']||''),
    peso:_toInt(r['peso']), status:String(r['status']||'pendente'),
    dataFim:_toDateStr(r['data_fim']), automacaoId:String(r['automacao_id']||''), ordem:_toInt(r['ordem']),
    responsavel:String(r['responsavel']||'')
  }));
  const usuarios = _readStaging(ss, 'USUARIOS').map(r=>({
    email:String(r['email']||''), nome:String(r['nome']||''),
    role:String(r['role']||'user'), ativo:r['ativo']!==false,
    buPadrao:String(r['bu_padrao']||''),
    busPermitidas:String(r['bus_permitidas']||'').split(',').map(s=>s.trim()).filter(Boolean)
  }));
  const bus = _readStaging(ss, 'BUS').map(_parseBu).sort((a,b)=>(a.ordem||0)-(b.ordem||0));
  const nextEtapaId = parseInt(getConfig('next_etapa_id') || '1000');
  log_('INFO', 'Load: ' + lanes.length + 'L / ' + projetos.length + 'P / ' + evolucoes.length + 'E / ' + etapas.length + 'Et');
  return { bus, lanes, projetos, evolucoes, etapas, usuarios, nextProjId, nextLaneId, nextEtapaId };
}
// ── FIM BLOCO ──

// ═══ BLOCO: SETUP (cria todas as abas) ═══
function handleSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  _criarAbaConfig(ss);
  _criarAbaLog(ss);

  Object.keys(SCHEMA).forEach(entidade => {
    _criarAbaRaw(ss, entidade, SCHEMA[entidade]);
    _criarAbaStaging(ss, entidade, SCHEMA[entidade]);
  });

  _criarAbaMarts(ss);
  _limparAbaPadrao(ss);
  _protegerAba(ss, 'LOG');

  log_('INFO', 'Setup concluído — Data Lake criado');
  return { ok: true, message: 'Data Lake criado com sucesso!' };
}
// ── FIM BLOCO ──

// ═══ BLOCO: AÇÕES GRANULARES ═══
function handleUpsertLane(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  appendRaw('LANES', payload, 'gantt');
  upsertStaging(ss, 'LANES', payload, 'id');
  log_('INFO', 'Upsert lane id=' + payload.id + ' nome=' + payload.nome);
  return { ok: true };
}

function handleDeleteLane(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _deleteFromStaging(ss, 'LANES', 'id', payload.id);
  _deleteFromStaging(ss, 'PROJETOS', 'lane_id', payload.id);
  _deleteFromRaw(ss, 'EVOLUCOES', 'proj_id', payload.projIds || []);
  log_('INFO', 'Delete lane id=' + payload.id);
  return { ok: true };
}

function handleUpsertProj(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  appendRaw('PROJETOS', payload, 'gantt');
  upsertStaging(ss, 'PROJETOS', payload, 'id');
  log_('INFO', 'Upsert projeto id=' + payload.id + ' nome=' + payload.nome);
  return { ok: true };
}

function handleDeleteProj(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _deleteFromStaging(ss, 'PROJETOS', 'id', [payload.id]);
  log_('INFO', 'Delete projeto id=' + payload.id);
  return { ok: true };
}

function handleAddEvolucao(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  appendRaw('EVOLUCOES', payload, 'gantt');
  // Também atualiza pct do projeto no staging
  if (payload.proj_id && payload.pct !== undefined) {
    const proj = _findInStaging(ss, 'PROJETOS', 'id', payload.proj_id);
    if (proj) {
      proj.pct = payload.pct;
      upsertStaging(ss, 'PROJETOS', proj, 'id');
    }
  }
  log_('INFO', 'Evolucao proj_id=' + payload.proj_id + ' pct=' + payload.pct + '%');
  return { ok: true };
}

function handleSetMeta(payload) {
  if (payload.next_proj_id) setConfig('next_proj_id', payload.next_proj_id, 'Próximo ID de projeto');
  if (payload.next_lane_id) setConfig('next_lane_id', payload.next_lane_id, 'Próximo ID de lane');
  return { ok: true };
}

function handleSaveAll(payload) {
  // Bulk save — usado para sincronização inicial / force sync
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (payload.lanes) {
    _clearStaging(ss, 'LANES');
    payload.lanes.forEach((l, i) => {
      const data = { id: l.id, nome: l.nome, cor: l.cor, ordem: i };
      appendRaw('LANES', data, 'bulk');
      upsertStaging(ss, 'LANES', data, 'id');
    });
  }
  if (payload.projetos) {
    _clearStaging(ss, 'PROJETOS');
    payload.projetos.forEach(p => {
      const data = { id: p.id, lane_id: p.laneId, nome: p.nome, status: p.status,
                     inicio: p.inicio || '', fim: p.fim || '', pct: p.pct, detalhe: p.detalhe || '' };
      appendRaw('PROJETOS', data, 'bulk');
      upsertStaging(ss, 'PROJETOS', data, 'id');
    });
  }
  if (payload.evolucoes) {
    payload.evolucoes.forEach(e => {
      // Só append raw — não duplicar se já existir
      const jaExiste = _findInRaw(ss, 'EVOLUCOES', 'id', e.id);
      if (!jaExiste) {
        appendRaw('EVOLUCOES', { id: e.id, proj_id: e.projId, data: e.data, pct: e.pct, nota: e.nota || '' }, 'bulk');
      }
    });
  }
  if (payload.etapas) {
    _clearStaging(ss, 'ETAPAS');
    payload.etapas.forEach(e => {
      const data = {id:e.id, proj_id:e.projId||e.proj_id, nome:e.nome, peso:e.peso, status:e.status||'pendente', data_fim:e.dataFim||e.data_fim||'', automacao_id:e.automacaoId||e.automacao_id||'', ordem:e.ordem||0};
      appendRaw('ETAPAS', data, 'bulk');
      upsertStaging(ss, 'ETAPAS', data, 'id');
    });
  }
  if (payload.nextEtapaId) setConfig('next_etapa_id', payload.nextEtapaId, 'Próximo ID de etapa');
  if (payload.nextProjId) setConfig('next_proj_id', payload.nextProjId, 'Próximo ID de projeto');
  if (payload.nextLaneId) setConfig('next_lane_id', payload.nextLaneId, 'Próximo ID de lane');

  log_('INFO', 'SaveAll: ' + (payload.lanes||[]).length + 'L / ' + (payload.projetos||[]).length + 'P');
  return { ok: true };
}
// ── FIM BLOCO ──

// ═══ BLOCO: CRIADORES DE ABA ═══
function _criarAbaRaw(ss, entidade, colunas) {
  const nomeAba = 'RAW_' + entidade;
  const aba = ss.getSheetByName(nomeAba) || ss.insertSheet(nomeAba);
  _aplicarHeader(aba, ['_importado_em', '_fonte', ...colunas]);
  _formatarAba(aba, DL_CONFIG.sheetColors.raw);
}

function _criarAbaStaging(ss, entidade, colunas) {
  const nomeAba = 'STAGING_' + entidade;
  const aba = ss.getSheetByName(nomeAba) || ss.insertSheet(nomeAba);
  _aplicarHeader(aba, ['_processado_em', '_valido', ...colunas]);
  _formatarAba(aba, DL_CONFIG.sheetColors.staging);
}

function _criarAbaMarts(ss) {
  const aba = ss.getSheetByName('MARTS') || ss.insertSheet('MARTS');
  _aplicarHeader(aba, ['_atualizado_em', 'dimensao', 'metrica', 'valor', 'periodo', 'granularidade']);
  _formatarAba(aba, DL_CONFIG.sheetColors.marts);
  // Placeholder de KPIs futuros
  if (aba.getLastRow() < 2) {
    const placeholders = [
      [new Date().toISOString(), 'projetos', 'total',        0, 'all-time', 'count'],
      [new Date().toISOString(), 'projetos', 'em_andamento', 0, 'current',  'count'],
      [new Date().toISOString(), 'projetos', 'concluidos',   0, 'all-time', 'count'],
      [new Date().toISOString(), 'projetos', 'pct_medio',    0, 'current',  'avg'],
    ];
    aba.getRange(2, 1, placeholders.length, 6).setValues(placeholders);
  }
}

function _criarAbaConfig(ss) {
  const aba = ss.getSheetByName('CONFIG') || ss.insertSheet('CONFIG');
  _aplicarHeader(aba, ['chave', 'valor', 'descricao', 'ultima_atualizacao']);
  _formatarAba(aba, DL_CONFIG.sheetColors.config);
  if (aba.getLastRow() < 2) {
    const seed = [
      ['project_name',  DL_CONFIG.projectName, 'Nome do projeto',       new Date().toISOString()],
      ['version',       DL_CONFIG.version,      'Versão do schema',      new Date().toISOString()],
      ['created_at',    DL_CONFIG.createdAt,    'Data de criação',       new Date().toISOString()],
      ['next_proj_id',  '100',                  'Próximo ID de projeto', new Date().toISOString()],
      ['next_lane_id',  '10',                   'Próximo ID de lane',    new Date().toISOString()],
      ['status',        'active',               'Status do data lake',   new Date().toISOString()],
    ];
    aba.getRange(2, 1, seed.length, 4).setValues(seed);
  }
}

function _criarAbaLog(ss) {
  const aba = ss.getSheetByName('LOG') || ss.insertSheet('LOG');
  _aplicarHeader(aba, ['timestamp', 'nivel', 'mensagem', 'usuario', 'contexto']);
  _formatarAba(aba, DL_CONFIG.sheetColors.log);
}

function _limparAbaPadrao(ss) {
  ['Plan1','Sheet1','Planilha1','Folha1'].forEach(nome => {
    const aba = ss.getSheetByName(nome);
    if (aba && ss.getNumSheets() > 1) try { ss.deleteSheet(aba); } catch(e) {}
  });
}

function _protegerAba(ss, nomeAba) {
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return;
  const p = aba.protect();
  p.setDescription('Log protegido — append via script apenas');
  p.setWarningOnly(true);
}
// ── FIM BLOCO ──

// ═══ BLOCO: HELPERS VISUAIS ═══
// Adiciona ao final da aba qualquer coluna do SCHEMA que ainda não exista.
// Idempotente: roda a cada load sem duplicar nem mexer nos dados.
function _migrarColunas(ss) {
  Object.keys(SCHEMA).forEach(function(entidade) {
    ['RAW_', 'STAGING_'].forEach(function(prefixo) {
      const aba = ss.getSheetByName(prefixo + entidade);
      if (!aba) return;
      const lastCol = aba.getLastColumn();
      if (!lastCol) return;
      const headers = aba.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
      const faltando = SCHEMA[entidade].filter(function(c) { return headers.indexOf(c) < 0; });
      if (!faltando.length) return;
      aba.getRange(1, lastCol + 1, 1, faltando.length).setValues([faltando]);
      log_('INFO', 'Migração: ' + prefixo + entidade + ' +[' + faltando.join(', ') + ']');
    });
  });
}

function _aplicarHeader(aba, colunas) {
  const r = aba.getRange(1, 1, 1, colunas.length);
  r.setValues([colunas]);
  r.setBackground(DL_CONFIG.sheetColors.header);
  r.setFontColor(DL_CONFIG.sheetColors.headerText);
  r.setFontWeight('bold');
  r.setFontSize(10);
  aba.setFrozenRows(1);
}

function _formatarAba(aba, cor) {
  const cols = aba.getLastColumn() || 10;
  aba.getRange(2, 1, 500, cols).setBackground(cor);
  try { aba.autoResizeColumns(1, cols); } catch(e) {}
}
// ── FIM BLOCO ──

// ═══ BLOCO: HELPERS DE LEITURA ═══
function _readStaging(ss, entidade) {
  const aba = ss.getSheetByName('STAGING_' + entidade);
  if (!aba || aba.getLastRow() < 2) return [];
  const [headers, ...rows] = aba.getDataRange().getValues();
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

function _readRaw(ss, entidade) {
  const aba = ss.getSheetByName('RAW_' + entidade);
  if (!aba || aba.getLastRow() < 2) return [];
  const [headers, ...rows] = aba.getDataRange().getValues();
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

function _findInStaging(ss, entidade, campo, valor) {
  return _readStaging(ss, entidade).find(r => String(r[campo]) === String(valor)) || null;
}

function _findInRaw(ss, entidade, campo, valor) {
  return _readRaw(ss, entidade).find(r => String(r[campo]) === String(valor)) || null;
}

function _clearStaging(ss, entidade) {
  const aba = ss.getSheetByName('STAGING_' + entidade);
  if (!aba || aba.getLastRow() < 2) return;
  aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).clearContent();
}

function _deleteFromStaging(ss, entidade, campo, valores) {
  const nomeAba = 'STAGING_' + entidade;
  const aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() < 2) return;
  const [headers, ...rows] = aba.getDataRange().getValues();
  const colIdx = headers.indexOf(campo);
  if (colIdx < 0) return;
  // Deletar de baixo pra cima para não deslocar índices
  for (let i = rows.length - 1; i >= 0; i--) {
    if ([].concat(valores).map(String).includes(String(rows[i][colIdx]))) {
      aba.deleteRow(i + 2);
    }
  }
}

function _deleteFromRaw(ss, entidade, campo, valores) {
  const nomeAba = 'RAW_' + entidade;
  const aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() < 2) return;
  const [headers, ...rows] = aba.getDataRange().getValues();
  const colIdx = headers.indexOf(campo);
  if (colIdx < 0) return;
  for (let i = rows.length - 1; i >= 0; i--) {
    if ([].concat(valores).map(String).includes(String(rows[i][colIdx]))) {
      aba.deleteRow(i + 2);
    }
  }
}
// ── FIM BLOCO ──

// ═══ BLOCO: PARSERS (Sheets → JS) ═══
function _parseLane(row) {
  return {
    id:     _toInt(row['id']),
    nome:   String(row['nome'] || ''),
    cor:    String(row['cor'] || '#4F7CFF'),
    ordem:  _toInt(row['ordem']),
  };
}

function _parseBu(row) {
  return {
    id:    String(row['id'] || ''),
    nome:  String(row['nome'] || ''),
    cor:   String(row['cor'] || '#4F7CFF'),
    ordem: _toInt(row['ordem']),
  };
}

function _parseProj(row) {
  return {
    id:      _toInt(row['id']),
    laneId:  _toInt(row['lane_id']),
    buId:    String(row['bu_id'] || ''),
    nome:    String(row['nome'] || ''),
    status:  String(row['status'] || 'Em planejamento'),
    inicio:  _toDateStr(row['inicio']),
    fim:     _toDateStr(row['fim']),
    pct:     _toInt(row['pct']),
    detalhe: String(row['detalhe'] || ''),
  };
}

function _parseEvo(row) {
  return {
    id:     _toInt(row['id']) || Date.now(),
    projId: _toInt(row['proj_id']),
    data:   _toDateStr(row['data']),
    pct:    _toInt(row['pct']),
    nota:   String(row['nota'] || ''),
  };
}

function _toInt(v) { const n = parseInt(v); return isNaN(n) ? 0 : n; }
function _toDateStr(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return String(v).split('T')[0];
}
// ── FIM BLOCO ──

// ═══ BLOCO: HELPERS DE ESCRITA ═══
function appendRaw(entidade, dados, fonte) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('RAW_' + entidade);
  if (!aba) return;
  const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const linha = headers.map(h => {
    if (h === '_importado_em') return new Date().toISOString();
    if (h === '_fonte') return fonte || 'manual';
    return dados[h] !== undefined ? dados[h] : '';
  });
  aba.appendRow(linha);
}

function upsertStaging(ss, entidade, dados, chave) {
  const nomeAba = 'STAGING_' + entidade;
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) return;
  const headers = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  const chaveCol = headers.indexOf(chave);
  if (chaveCol < 0) return;
  const novaLinha = headers.map(h => {
    if (h === '_processado_em') return new Date().toISOString();
    if (h === '_valido') return true;
    return dados[h] !== undefined ? dados[h] : '';
  });
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha >= 2) {
    const ids = aba.getRange(2, chaveCol + 1, ultimaLinha - 1, 1).getValues().flat().map(String);
    const idx = ids.indexOf(String(dados[chave]));
    if (idx >= 0) {
      aba.getRange(idx + 2, 1, 1, headers.length).setValues([novaLinha]);
      return;
    }
  }
  aba.appendRow(novaLinha);
}
// ── FIM BLOCO ──

// ═══ BLOCO: CONFIG HELPERS ═══
function setConfig(chave, valor, descricao) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('CONFIG');
  if (!aba) return;
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === chave) {
      aba.getRange(i + 1, 2).setValue(valor);
      aba.getRange(i + 1, 4).setValue(new Date().toISOString());
      return;
    }
  }
  aba.appendRow([chave, valor, descricao || '', new Date().toISOString()]);
}

function getConfig(chave) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('CONFIG');
  if (!aba) return null;
  const row = aba.getDataRange().getValues().find(r => r[0] === chave);
  return row ? row[1] : null;
}
// ── FIM BLOCO ──

// ═══ BLOCO: LOG ═══
function log_(nivel, mensagem, contexto) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName('LOG');
    if (!aba) return;
    const usuario = Session.getActiveUser().getEmail() || 'sistema';
    aba.appendRow([new Date().toISOString(), nivel || 'INFO', mensagem, usuario, contexto || '']);
  } catch(e) {
    console.log('[LOG FALHOU]', e.message);
  }
}
// ── FIM BLOCO ──

// ═══ BLOCO: RESPONSE HELPERS ═══
function jsonOk(data) {
  const out = ContentService.createTextOutput(JSON.stringify({ ok: true, ...data }));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}

function jsonErr(msg) {
  const out = ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg }));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
// ── FIM BLOCO ──



function handleUpsertEtapa(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {
    id: payload.id, proj_id: payload.proj_id,
    nome: payload.nome, peso: payload.peso || 0,
    status: payload.status || 'pendente',
    data_fim: payload.data_fim || '',
    automacao_id: payload.automacao_id || '',
    ordem: payload.ordem || 0
  };
  appendRaw('ETAPAS', data, 'gantt');
  upsertStaging(ss, 'ETAPAS', data, 'id');
  log_('INFO', 'Upsert etapa id=' + data.id + ' proj=' + data.proj_id + ' status=' + data.status);
  return { ok: true };
}

function handleDeleteEtapa(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _deleteFromStaging(ss, 'ETAPAS', 'id', [payload.id]);
  log_('INFO', 'Delete etapa id=' + payload.id);
  return { ok: true };
}

// ═══ BLOCO: AUTH ═══
// Senha: SHA-256(salt + senha), salt aleatório por usuário.
// Apps Script não tem bcrypt — isto protege contra leitura casual da
// planilha, NÃO contra ataque offline dedicado. Não reutilizar senhas.

function _salt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function _hash(salt, senha) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, String(salt) + String(senha), Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// Comparação de tempo constante — evita vazar o hash por timing
function _igual(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

function _novoToken(email) {
  const tk = Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + tk, email, 21600); // 6h
  return tk;
}

function validarToken(tk) {
  if (!tk) return null;
  return CacheService.getScriptCache().get('sess_' + tk);
}

function handleLogin(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const email = String(payload.email || '').trim().toLowerCase();
  const senha = String(payload.senha || '');
  if (!email || !senha) return { ok: false, error: 'Informe e-mail e senha' };

  const u = _findInStaging(ss, 'USUARIOS', 'email', email);
  if (!u) { log_('WARN', 'Login falhou (inexistente): ' + email); return { ok: false, error: 'E-mail ou senha inválidos' }; }
  if (u['ativo'] === false) return { ok: false, error: 'Usuário inativo' };

  // Primeiro acesso: usuário existe mas ainda não tem senha → define agora
  if (!u['senha_hash']) {
    const salt = _salt();
    u['salt'] = salt;
    u['senha_hash'] = _hash(salt, senha);
    u['ultimo_login'] = new Date().toISOString();
    upsertStaging(ss, 'USUARIOS', u, 'email');
    log_('INFO', 'Senha definida no primeiro acesso: ' + email);
    return { ok: true, primeiroAcesso: true, token: _novoToken(email), usuario: _perfil(u) };
  }

  if (!_igual(u['senha_hash'], _hash(u['salt'], senha))) {
    log_('WARN', 'Login falhou (senha): ' + email);
    return { ok: false, error: 'E-mail ou senha inválidos' };
  }

  u['ultimo_login'] = new Date().toISOString();
  upsertStaging(ss, 'USUARIOS', u, 'email');
  log_('INFO', 'Login OK: ' + email);
  return { ok: true, token: _novoToken(email), usuario: _perfil(u) };
}

// Nunca devolve hash nem salt para o cliente
function _perfil(u) {
  return {
    email: String(u['email'] || ''),
    nome: String(u['nome'] || ''),
    cargo: String(u['cargo'] || ''),
    role: String(u['role'] || 'user'),
    buPadrao: String(u['bu_padrao'] || ''),
    busPermitidas: String(u['bus_permitidas'] || '').split(',').map(function(s){return s.trim();}).filter(Boolean),
  };
}

function handleSetSenha(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const email = String(payload.email || '').trim().toLowerCase();
  const u = _findInStaging(ss, 'USUARIOS', 'email', email);
  if (!u) return { ok: false, error: 'Usuário não encontrado' };

  // Troca própria exige a senha atual; admin reseta sem ela
  const ehReset = payload.adminToken && validarToken(payload.adminToken);
  if (!ehReset) {
    if (!u['senha_hash'] || !_igual(u['senha_hash'], _hash(u['salt'], String(payload.senhaAtual || '')))) {
      return { ok: false, error: 'Senha atual incorreta' };
    }
  }
  const nova = String(payload.senhaNova || '');
  if (nova.length < 6) return { ok: false, error: 'Senha precisa de 6+ caracteres' };

  const salt = _salt();
  u['salt'] = salt;
  u['senha_hash'] = _hash(salt, nova);
  upsertStaging(ss, 'USUARIOS', u, 'email');
  log_('INFO', 'Senha alterada: ' + email + (ehReset ? ' (reset admin)' : ''));
  return { ok: true };
}

// Admin cria usuário sem senha — ela é definida no primeiro login dele
function handleCriarUsuario(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'E-mail obrigatório' };
  if (_findInStaging(ss, 'USUARIOS', 'email', email)) return { ok: false, error: 'E-mail já cadastrado' };

  const data = {
    email: email, nome: payload.nome || '', cargo: payload.cargo || '',
    role: payload.role || 'user', ativo: true, criado_em: new Date().toISOString(),
    bu_padrao: '', bus_permitidas: (payload.busPermitidas || []).join(','),
    senha_hash: '', salt: '', ultimo_login: ''
  };
  appendRaw('USUARIOS', data, 'gantt');
  upsertStaging(ss, 'USUARIOS', data, 'email');
  log_('INFO', 'Usuário criado: ' + email);
  return { ok: true };
}
// ── FIM BLOCO ──

// ═══ BLOCO: INTEGRACOES (proxy — segredos ficam aqui, nunca no HTML) ═══
// O token é lido de Script Properties. O front pede a métrica e recebe
// número pronto; nunca vê credencial. Mesmo padrão do Worker do Asaas.

const REPOS_DMG = {
  'erp-dimplus': 'dmgocupacional/erp-dimplus',
  'dmg-erp':     'dmgocupacional/dmg-erp',
  'crm-dmg':     'dmgocupacional/crm-dmg',
};

function _ghToken() {
  return PropertiesService.getScriptProperties().getProperty('GH_TOKEN') || '';
}

// Commits por semana nas últimas N semanas + versão do package.json.
// Cache de 30min — o Apps Script tem quota curta de UrlFetchApp.
function handleMetricasRepo(payload) {
  const token = _ghToken();
  if (!token) return { ok: false, error: 'GH_TOKEN não configurado nas Script Properties' };

  const chave = payload && payload.repo ? payload.repo : 'all';
  const cache = CacheService.getScriptCache();
  const hit = cache.get('metricas_' + chave);
  if (hit && !(payload && payload.force)) return { ok: true, cached: true, repos: JSON.parse(hit) };

  const alvos = (payload && payload.repo && REPOS_DMG[payload.repo])
    ? [[payload.repo, REPOS_DMG[payload.repo]]]
    : Object.keys(REPOS_DMG).map(function(k){ return [k, REPOS_DMG[k]]; });

  const semanas = (payload && payload.semanas) ? payload.semanas : 12;
  const desde = new Date(Date.now() - semanas * 7 * 86400000).toISOString();
  const headers = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' };
  const out = {};

  alvos.forEach(function(par) {
    const chaveRepo = par[0], full = par[1];
    try {
      const rc = UrlFetchApp.fetch(
        'https://api.github.com/repos/' + full + '/commits?since=' + desde + '&per_page=100',
        { headers: headers, muteHttpExceptions: true });
      const commits = rc.getResponseCode() === 200 ? JSON.parse(rc.getContentText()) : [];

      // Agrupa por semana ISO para desenhar a curva de atividade
      const porSemana = {};
      commits.forEach(function(c) {
        const d = new Date(c.commit.author.date);
        const k = d.getFullYear() + '-W' + Math.ceil(((d - new Date(d.getFullYear(),0,1)) / 86400000 + 1) / 7);
        porSemana[k] = (porSemana[k] || 0) + 1;
      });

      // Versão atual do package.json
      let versao = '';
      const rp = UrlFetchApp.fetch(
        'https://api.github.com/repos/' + full + '/contents/package.json',
        { headers: headers, muteHttpExceptions: true });
      if (rp.getResponseCode() === 200) {
        const j = JSON.parse(rp.getContentText());
        const pkg = JSON.parse(Utilities.newBlob(Utilities.base64Decode(j.content)).getDataAsString());
        versao = pkg.version || '';
      }

      out[chaveRepo] = {
        commits: commits.length,
        porSemana: porSemana,
        versao: versao,
        ultimoCommit: commits.length ? commits[0].commit.author.date : '',
      };
    } catch (e) {
      out[chaveRepo] = { erro: String(e).substring(0, 80) };
    }
  });

  cache.put('metricas_' + chave, JSON.stringify(out), 1800);
  log_('INFO', 'Métricas repo: ' + Object.keys(out).join(', '));
  return { ok: true, cached: false, repos: out };
}
// ── FIM BLOCO ──

// ═══ BLOCO: BUS (Business Units) ═══
function handleUpsertBu(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = { id: payload.id, nome: payload.nome||'', cor: payload.cor||'#4F7CFF', ordem: payload.ordem||0 };
  appendRaw('BUS', data, 'gantt');
  upsertStaging(ss, 'BUS', data, 'id');
  log_('INFO', 'Upsert BU: ' + data.id + ' (' + data.nome + ')');
  return { ok: true };
}

function handleDeleteBu(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _deleteFromStaging(ss, 'BUS', 'id', [payload.id]);
  // Projetos da BU removida voltam para "sem BU" — nunca são apagados.
  const projs = _readStaging(ss, 'PROJETOS');
  projs.forEach(function(r) {
    if (String(r['bu_id']) === String(payload.id)) {
      r['bu_id'] = '';
      upsertStaging(ss, 'PROJETOS', r, 'id');
    }
  });
  log_('WARN', 'Delete BU: ' + payload.id + ' — projetos desvinculados');
  return { ok: true };
}

// Preferência do usuário (BU padrão + BUs permitidas) — persiste por perfil
function handleSetPref(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const email = String(payload.email || '').toLowerCase();
  if (!email) return { ok: false, error: 'email obrigatório' };
  const atual = _findInStaging(ss, 'USUARIOS', 'email', email);
  const data = {
    email: email,
    nome: payload.nome !== undefined ? payload.nome : (atual ? atual['nome'] : ''),
    role: payload.role !== undefined ? payload.role : (atual ? atual['role'] : 'user'),
    ativo: atual ? atual['ativo'] !== false : true,
    criado_em: atual && atual['criado_em'] ? atual['criado_em'] : new Date().toISOString(),
    bu_padrao: payload.buPadrao !== undefined ? payload.buPadrao : (atual ? atual['bu_padrao'] : ''),
    bus_permitidas: payload.busPermitidas !== undefined
      ? (Array.isArray(payload.busPermitidas) ? payload.busPermitidas.join(',') : payload.busPermitidas)
      : (atual ? atual['bus_permitidas'] : '')
  };
  upsertStaging(ss, 'USUARIOS', data, 'email');
  log_('INFO', 'Pref usuario ' + email + ' → bu_padrao=' + data.bu_padrao);
  return { ok: true };
}
// ── FIM BLOCO ──

function handleUpsertUsuario(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const _ant = _findInStaging(ss, 'USUARIOS', 'email', payload.email);
  const data = {
    email: payload.email, nome: payload.nome||'', role: payload.role||'user',
    ativo: true, criado_em: new Date().toISOString(),
    // Preserva preferências já existentes — upsert de usuário não pode zerar BU
    bu_padrao: _ant ? (_ant['bu_padrao']||'') : '',
    bus_permitidas: _ant ? (_ant['bus_permitidas']||'') : ''
  };
  appendRaw('USUARIOS', data, 'gantt');
  upsertStaging(ss, 'USUARIOS', data, 'email');
  log_('INFO', 'Upsert usuario: ' + payload.email + ' (' + payload.role + ')');
  return { ok: true };
}
function handleDeleteUsuario(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _deleteFromStaging(ss, 'USUARIOS', 'email', [payload.email]);
  log_('INFO', 'Delete usuario: ' + payload.email);
  return { ok: true };
}
// ═══ BLOCO: AUTOMAÇÕES ═══

function handleDigest(payload) {
  const projetos = payload.projetos || [];
  const lanes    = payload.lanes    || [];
  const hoje     = new Date(); hoje.setHours(0,0,0,0);

  const atrasados  = projetos.filter(p => !['Concluído','Pausado'].includes(p.status) && p.fim && new Date(p.fim) < hoje && p.pct < 100);
  const emAndamento= projetos.filter(p => p.status === 'Em andamento');
  const concluidos = projetos.filter(p => p.status === 'Concluído');
  const pctMedio   = projetos.length ? Math.round(projetos.reduce((s,p)=>s+(p.pct||0),0)/projetos.length) : 0;

  // Monta resumo por lane
  const laneResumo = lanes.map(l => {
    const ps = projetos.filter(p => p.laneId === l.id || p.lane_id === l.id);
    const avg = ps.length ? Math.round(ps.reduce((s,p)=>s+(p.pct||0),0)/ps.length) : 0;
    return `${l.nome}: ${ps.length}p · ${avg}% médio`;
  }).join('\n');

  const corpo = [
    '=== WAR ROOM — DIGEST SEMANAL ===',
    `Data: ${new Date().toLocaleDateString('pt-BR')}`,
    '',
    `Projetos totais: ${projetos.length}`,
    `Progresso médio: ${pctMedio}%`,
    `Em andamento: ${emAndamento.length}`,
    `Concluídos: ${concluidos.length}`,
    `Atrasados: ${atrasados.length}`,
    '',
    '--- Por Lane ---',
    laneResumo,
    '',
    '--- Atrasados ---',
    atrasados.length ? atrasados.map(p => `• ${p.nome} (${p.pct}%)`).join('\n') : 'Nenhum!',
  ].join('\n');

  // Tentar enviar email para o owner do script
  try {
    const email = Session.getActiveUser().getEmail();
    if (email) {
      GmailApp.sendEmail(email, '⚡ War Room · Digest Semanal', corpo);
    }
  } catch(e) {
    // GmailApp pode não estar autorizado — só loga
  }

  log_('INFO', 'Digest gerado: ' + projetos.length + ' projetos, ' + atrasados.length + ' atrasados');
  return { ok: true, msg: atrasados.length + ' atrasado(s)' };
}

function handleAlerta(payload) {
  const projetos = payload.projetos || [];
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const atrasados = projetos.filter(p =>
    !['Concluído','Pausado'].includes(p.status) &&
    p.fim && new Date(p.fim) < hoje && (p.pct||0) < 100
  );
  atrasados.forEach(p => {
    const dias = Math.round((hoje - new Date(p.fim)) / 86400000);
    log_('ALERTA', `Projeto atrasado ${dias}d: ${p.nome} (${p.pct}%)`);
  });
  return { ok: true, msg: atrasados.length + ' alerta(s) registrado(s)' };
}

function handleRunMarts(payload) {
  atualizarMarts();
  return { ok: true, msg: 'MARTS atualizado' };
}

function handleSnapshot(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();
  const nomAba = 'SNAPSHOT_' + now.getFullYear() + '_' + String(now.getMonth()+1).padStart(2,'0');

  // Verifica se snapshot do mês já existe
  if (ss.getSheetByName(nomAba)) {
    return { ok: true, msg: 'Snapshot ' + nomAba + ' já existe' };
  }

  const origem = ss.getSheetByName('STAGING_PROJETOS');
  if (!origem) return { ok: false, error: 'STAGING_PROJETOS não encontrada' };

  const destino = ss.insertSheet(nomAba);
  const data = origem.getDataRange().getValues();
  destino.getRange(1, 1, data.length, data[0].length).setValues(data);
  // Cor de fundo azul claro para distinguir de STAGING
  destino.getRange(1,1,1,data[0].length).setBackground('#C8D8F0').setFontWeight('bold');
  destino.setTabColor('#4F7CFF');
  _formatarAba(destino, '#EEF4FF');

  log_('INFO', 'Snapshot criado: ' + nomAba + ' com ' + (data.length-1) + ' projetos');
  return { ok: true, msg: nomAba + ' criado' };
}
// ── FIM BLOCO ──
// ═══ BLOCO: MARTS UPDATE (trigger manual ou cron) ═══
/**
 * Recalcula os KPIs no MARTS.
 * Rodar manualmente ou configurar como trigger diário.
 */
function atualizarMarts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const projetos = _readStaging(ss, 'PROJETOS').map(_parseProj);
  const aba = ss.getSheetByName('MARTS');
  if (!aba) return;

  const agora = new Date().toISOString();
  const total       = projetos.length;
  const emAndamento = projetos.filter(p => p.status === 'Em andamento').length;
  const concluidos  = projetos.filter(p => p.status === 'Concluído').length;
  const pctMedio    = total ? Math.round(projetos.reduce((s, p) => s + p.pct, 0) / total) : 0;

  const marts = [
    [agora, 'projetos', 'total',        total,       'all-time', 'count'],
    [agora, 'projetos', 'em_andamento', emAndamento, 'current',  'count'],
    [agora, 'projetos', 'concluidos',   concluidos,  'all-time', 'count'],
    [agora, 'projetos', 'pct_medio',    pctMedio,    'current',  'avg'],
  ];

  // Limpa e reescreve (simples, MARTS é pequeno)
  if (aba.getLastRow() > 1) aba.getRange(2, 1, aba.getLastRow() - 1, 6).clearContent();
  aba.getRange(2, 1, marts.length, 6).setValues(marts);
  log_('INFO', 'MARTS atualizado: total=' + total + ' pctMedio=' + pctMedio + '%');
}
// ── FIM BLOCO ──

// ═══ BLOCO: SESSOES_TRABALHO (Mobile) ═══
/**
 * Registra início de uma sessão de trabalho.
 * payload: { id, etapa_id, proj_id, user_email, inicio_iso, nota, dispositivo }
 */
function handleStartSessao(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {
    id:          payload.id || Utilities.getUuid(),
    etapa_id:    payload.etapa_id || '',
    proj_id:     payload.proj_id || '',
    user_email:  payload.user_email || '',
    inicio_iso:  payload.inicio_iso || new Date().toISOString(),
    fim_iso:     '',
    duracao_min: 0,
    nota:        payload.nota || '',
    dispositivo: payload.dispositivo || 'mobile',
  };
  appendRaw('SESSOES_TRABALHO', data, 'mobile');
  upsertStaging(ss, 'SESSOES_TRABALHO', data, 'id');
  log_('INFO', 'Sessão iniciada id=' + data.id + ' etapa=' + data.etapa_id + ' user=' + data.user_email);
  return { ok: true, id: data.id };
}

/**
 * Registra fim de uma sessão de trabalho.
 * payload: { id, fim_iso, duracao_min, nota }
 */
function handleEndSessao(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sessao = _findInStaging(ss, 'SESSOES_TRABALHO', 'id', payload.id);
  if (!sessao) {
    const data = {
      id:          payload.id,
      etapa_id:    '',
      proj_id:     '',
      user_email:  '',
      inicio_iso:  '',
      fim_iso:     payload.fim_iso || new Date().toISOString(),
      duracao_min: payload.duracao_min || 0,
      nota:        payload.nota || '',
      dispositivo: 'mobile',
    };
    appendRaw('SESSOES_TRABALHO', data, 'mobile-end');
    upsertStaging(ss, 'SESSOES_TRABALHO', data, 'id');
    log_('WARN', 'End sessao sem start no staging: ' + payload.id);
    return { ok: true };
  }
  sessao.fim_iso     = payload.fim_iso || new Date().toISOString();
  sessao.duracao_min = payload.duracao_min || 0;
  sessao.nota        = payload.nota || sessao.nota || '';
  appendRaw('SESSOES_TRABALHO', sessao, 'mobile-end');
  upsertStaging(ss, 'SESSOES_TRABALHO', sessao, 'id');
  log_('INFO', 'Sessão encerrada id=' + payload.id + ' dur=' + sessao.duracao_min + 'min');
  return { ok: true };
}

/**
 * Retorna sessões de hoje para um usuário.
 * GET ?action=get_sessoes_hoje&email=xxx
 */
function handleGetSessoesHoje(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const email = (params && params.email) || '';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const todas = _readStaging(ss, 'SESSOES_TRABALHO');
  const sessoes = todas.filter(function(r) {
    if (email && String(r['user_email'] || '').toLowerCase() !== email.toLowerCase()) return false;
    const ini = r['inicio_iso'] ? new Date(r['inicio_iso']) : null;
    return ini && ini >= hoje;
  }).map(function(r) {
    return {
      id:          String(r['id'] || ''),
      etapa_id:    Number(r['etapa_id']) || 0,
      proj_id:     Number(r['proj_id']) || 0,
      user_email:  String(r['user_email'] || ''),
      inicio_iso:  String(r['inicio_iso'] || ''),
      fim_iso:     r['fim_iso'] ? String(r['fim_iso']) : null,
      duracao_min: Number(r['duracao_min']) || 0,
      nota:        String(r['nota'] || ''),
      dispositivo: String(r['dispositivo'] || 'mobile'),
    };
  });
  log_('INFO', 'GetSessoesHoje: ' + sessoes.length + ' sessoes para ' + (email || 'todos'));
  return { ok: true, sessoes: sessoes };
}
// ── FIM BLOCO ──
