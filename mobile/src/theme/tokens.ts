export const colors = {
  background: '#F2F4F7',
  surface: '#FFFFFF',
  primary: '#2F7A59',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  border: '#D8DEE6',
  danger: '#D14343',
  warningSurface: '#FFF8EB',
  warningBorder: '#F8D9A8',
  infoSurface: '#F3F7FF',
  infoBorder: '#D5E3FF',
  alertSurface: '#FFF1F1',
  alertBorder: '#FFCDD2',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
} as const;

export const typography = {
  title: 30,
  section: 18,
  body: 16,
  caption: 13,
  micro: 11,
} as const;
