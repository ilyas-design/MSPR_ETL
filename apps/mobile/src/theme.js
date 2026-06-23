/** Palette et tokens de design partagés par toute l'app. */
export const colors = {
  bg: '#0a0c10',
  bgElevated: '#0f1115',
  surface: '#161922',
  surfaceAlt: '#1e222d',
  surfaceHover: '#252a36',
  border: '#2a3040',
  borderLight: '#353b4d',
  primary: '#5b8cff',
  primaryLight: '#7aa3ff',
  primaryDark: '#3d6fd6',
  primaryGlow: 'rgba(91, 140, 255, 0.25)',
  accent: '#3ddc97',
  accentGlow: 'rgba(61, 220, 151, 0.2)',
  text: '#f4f6fb',
  textMuted: '#8b95a8',
  danger: '#ff5c6c',
  success: '#3ddc97',
  like: '#ff5c6c',
  warning: '#fbbf24',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const gradients = {
  hero: ['#1a2744', '#0f1115', '#0a0c10'],
  auth: ['#0f1628', '#0a0c10'],
  card: ['#1e2638', '#161922'],
  primary: ['#5b8cff', '#3d6fd6'],
  accent: ['#3ddc97', '#22c55e'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const typography = {
  hero: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const animation = {
  spring: { damping: 18, stiffness: 220, mass: 0.8 },
  springSnappy: { damping: 22, stiffness: 320, mass: 0.6 },
  duration: { fast: 180, normal: 320, slow: 520 },
};
