// ═══ BLOCO: THEME ═══
// Mirrors exactly --css-variables from war-room/index.html
// Single source of truth for all colors, spacing, typography.

export const Colors = {
  // Backgrounds
  bg:    '#080B12',
  bg2:   '#0E1219',
  bg3:   '#141A24',
  bg4:   '#1C2433',
  bg5:   '#232D3F',
  bg6:   '#2A3549',

  // Text
  text:  '#EEF2FF',
  text2: '#B0BCDA',
  text3: '#6B7DA0',
  text4: '#3A4560',

  // Borders
  border:  'rgba(100,130,200,0.08)',
  border2: 'rgba(100,130,200,0.16)',
  border3: 'rgba(100,130,200,0.28)',

  // Brand
  accent:      '#4F7CFF',
  accentDim:   'rgba(79,124,255,0.15)',
  green:       '#10B981',
  greenDim:    'rgba(16,185,129,0.15)',
  greenL:      '#34D399',
  orange:      '#F97316',
  orangeDim:   'rgba(249,115,22,0.15)',
  purple:      '#8B5CF6',
  purpleDim:   'rgba(139,92,246,0.15)',
  red:         '#EF4444',
  redDim:      'rgba(239,68,68,0.15)',
  amber:       '#F59E0B',
  amberDim:    'rgba(245,158,11,0.15)',
  cyan:        '#06B6D4',
  cyanDim:     'rgba(6,182,212,0.15)',

  // Shadows
  shadow:   'rgba(0,0,0,0.6)',
  shadowLg: 'rgba(0,0,0,0.75)',
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 14,
  xl: 22,
  full: 999,
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const FontSize = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 42,
  '5xl': 56,
  '6xl': 72,
} as const;

// Status colors helper
export const statusColor = (status: string): string => {
  switch (status) {
    case 'Em andamento':  return Colors.accent;
    case 'Concluído':     return Colors.green;
    case 'Pausado':       return Colors.text3;
    case 'Em risco':      return Colors.red;
    case 'Planejado':     return Colors.amber;
    case 'em_andamento':  return Colors.accent;
    case 'concluida':     return Colors.green;
    case 'pendente':      return Colors.text3;
    case 'bloqueada':     return Colors.red;
    default:              return Colors.text3;
  }
};

export const statusLabel = (status: string): string => {
  switch (status) {
    case 'Em andamento':  return 'Em Andamento';
    case 'Concluído':     return 'Concluído';
    case 'Pausado':       return 'Pausado';
    case 'Em risco':      return 'Em Risco';
    case 'Planejado':     return 'Planejado';
    case 'em_andamento':  return 'Em Andamento';
    case 'concluida':     return 'Concluída';
    case 'pendente':      return 'Pendente';
    case 'bloqueada':     return 'Bloqueada';
    default:              return status;
  }
};
// ── FIM BLOCO ──
