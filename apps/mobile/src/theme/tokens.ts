/**
 * Design tokens — parity dengan web shadcn globals.css
 * primary #003C16 oklch 0.22 0.08 142.5, radius 0.75rem (12px mobile), Inter font.
 */

export const colors = {
  primary: '#003C16',
  primaryDark: '#002B10',
  primaryLight: '#0B5A2A',
  primaryMuted: '#ECFDF5',
  border: '#E2E8F0',
  borderInput: '#CBD5E1',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  mutedLight: '#94A3B8',
  mutedBg: '#F1F5F9',
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  warn: '#F59E0B',
  warnBg: '#FEF3C7',
  warnBorder: '#FDE68A',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  info: '#0EA5E9',
  infoBg: '#E0F2FE',
  amber: '#B45309',
  purple: '#8B5CF6',
  purpleBg: '#EDE9FE',
  heroFrom: '#003C16',
  heroSub: '#A7F3D0',
  heroSub2: '#A7D7B6',
  overlay: 'rgba(15,23,42,0.55)',
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  } as const,
  hero: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  } as const,
};

export const font = {
  // expo-google-fonts/inter — dipakai via useFonts di App.tsx
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
  fallback: 'System',
} as const;

export const fontSize = {
  xs: 9,
  sm: 10,
  smPlus: 11,
  base: 13,
  title: 15,
  hero: 20,
  heroValue: 22,
};
