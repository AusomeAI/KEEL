/**
 * Keel Design System — Color Tokens
 *
 * This is a neutral, accessible palette designed to:
 * - Meet WCAG 2.2 AA contrast requirements
 * - Support light and dark modes without trading one for the other
 * - Work for global audiences (no culture-specific colors)
 * - Remain legible for 8% of males with color blindness
 *
 * Token naming: role-number, where 50 = neutral, 100 = lightest/brightest,
 * 950 = darkest. Numbers are semantic, not sequential.
 *
 * Light theme: uses lighter colors as backgrounds, darker for text/borders
 * Dark theme: uses darker colors as backgrounds, lighter for text/borders
 * Inverted at runtime based on prefers-color-scheme or data-theme attribute
 */

export const colorTokens = {
  // Neutral/Grayscale: the backbone
  // Light theme: background -> text
  // Dark theme: darkened -> lightened
  neutral: {
    50: '#FAFAFA',    // Lightest background (light) / Darkest background (dark)
    100: '#F5F5F5',   // Light backgrounds
    200: '#E7E7E7',   // Subtle dividers, disabled states
    300: '#D1D1D1',   // Borders, secondary UI
    400: '#A0A0A0',   // Secondary text
    500: '#717171',   // Default text (light)
    600: '#525252',   // Emphasis text
    700: '#3F3F3F',   // Strong emphasis
    800: '#262626',   // Heading text
    900: '#0D0D0D',   // Darkest (dark theme background)
    950: '#000000',   // Pure black (light theme text)
  },

  // Semantic: these stay consistent across themes in *meaning*
  // but inverse in *lightness* (light theme uses 50, dark theme uses 900)

  // Success (Green): approval, completion, positive action
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',   // Primary success
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#145231',
    950: '#0D2818',
  },

  // Warning (Amber): caution, non-blocking issue, info
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',   // Primary warning
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  // Error (Red): blocking issue, destructive action, failure
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',   // Primary error
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#451A1A',
  },

  // Info (Blue): informational, non-critical, contextual
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',   // Primary info
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
    950: '#0C2340',
  },

  // Brand (Indigo): primary action, focus, links (secondary brand color)
  brand: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',   // Primary brand
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },

  // Accent (Teal): attention, highlights, hover states
  accent: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',   // Primary accent
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
    950: '#0D3C38',
  },
} as const;

/**
 * Contrast pairs: (foreground, background) combinations that meet WCAG AA.
 * Used for text, icons, and interactive elements.
 *
 * Light theme: dark text on light background
 * Dark theme: light text on dark background
 */
export const contrastPairs = {
  // Text on neutral backgrounds
  textOnNeutral: {
    default: { light: 'neutral-950', background: 'neutral-50' },
    secondary: { light: 'neutral-600', background: 'neutral-100' },
    disabled: { light: 'neutral-400', background: 'neutral-50' },
  },

  // Text on semantic backgrounds
  textOnSuccess: {
    light: 'success-950',
    dark: 'success-50',
  },
  textOnError: {
    light: 'error-950',
    dark: 'error-50',
  },
  textOnWarning: {
    light: 'warning-950',
    dark: 'warning-50',
  },
  textOnInfo: {
    light: 'info-950',
    dark: 'info-50',
  },
  textOnBrand: {
    light: 'brand-950',
    dark: 'brand-50',
  },
} as const;

// Type definitions for token usage
export type ColorToken = keyof typeof colorTokens;
export type SemanticColor = keyof typeof colorTokens;
export type ColorValue = (typeof colorTokens)[ColorToken];
