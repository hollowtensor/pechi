export type ThemeMode = 'dark' | 'light';

export const darkColors = {
  background: '#0d0c0f',
  surface: 'rgba(240, 235, 227, 0.03)',
  surfaceBorder: 'rgba(240, 235, 227, 0.06)',
  surfaceElevated: 'rgba(240, 235, 227, 0.05)',
  text: '#f0ebe3',
  textMuted: 'rgba(240, 235, 227, 0.3)',
  textSecondary: 'rgba(240, 235, 227, 0.7)',
  accent: '#A3B836',
  accentLight: '#BCCC52',
  accentSurface: 'rgba(163, 184, 54, 0.15)',
  accentBorder: 'rgba(163, 184, 54, 0.25)',
  userBubble: 'rgba(163, 184, 54, 0.12)',
  userBubbleBorder: 'rgba(163, 184, 54, 0.18)',
  agentBubble: 'rgba(240, 235, 227, 0.06)',
  agentBubbleBorder: 'rgba(240, 235, 227, 0.08)',
  statusGreen: '#4ade80',
  statusYellow: '#fbbf24',
  stockGreen: 'rgba(76, 175, 80, 0.7)',
  stockRed: 'rgba(244, 67, 54, 0.7)',
  sheetBackground: 'rgba(20, 18, 24, 0.97)',
  sheetHandle: 'rgba(240, 235, 227, 0.2)',
};

export const lightColors: ThemeColors = {
  background: '#F5F5F0',
  surface: 'rgba(0, 0, 0, 0.03)',
  surfaceBorder: 'rgba(0, 0, 0, 0.08)',
  surfaceElevated: 'rgba(0, 0, 0, 0.05)',
  text: '#1a1a1a',
  textMuted: 'rgba(0, 0, 0, 0.35)',
  textSecondary: 'rgba(0, 0, 0, 0.6)',
  accent: '#7A8C1E',
  accentLight: '#8FA325',
  accentSurface: 'rgba(122, 140, 30, 0.12)',
  accentBorder: 'rgba(122, 140, 30, 0.25)',
  userBubble: 'rgba(122, 140, 30, 0.10)',
  userBubbleBorder: 'rgba(122, 140, 30, 0.20)',
  agentBubble: 'rgba(0, 0, 0, 0.04)',
  agentBubbleBorder: 'rgba(0, 0, 0, 0.08)',
  statusGreen: '#22c55e',
  statusYellow: '#f59e0b',
  stockGreen: 'rgba(34, 139, 34, 0.7)',
  stockRed: 'rgba(220, 38, 38, 0.7)',
  sheetBackground: 'rgba(245, 245, 240, 0.97)',
  sheetHandle: 'rgba(0, 0, 0, 0.2)',
};

export type ThemeColors = typeof darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};
