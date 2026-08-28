/**
 * Keel Design System — Token Export
 *
 * This module exports all design tokens in a format suitable for:
 * - TypeScript components (type-safe token usage)
 * - CSS variables (theme switching at runtime)
 * - Tailwind CSS (via tailwind.config.js)
 * - Documentation and design tools
 */

export { colorTokens, contrastPairs } from './colors';
export { spacingTokens, spacingPresets } from './spacing';
export {
  fontStack,
  typographyTokens,
  fontWeights,
  textTransforms,
  localisationSettings,
} from './typography';
export {
  shadowTokens,
  borderRadiusTokens,
  animationTokens,
  zIndexTokens,
} from './effects';

// Re-export type definitions
export type { ColorToken, SemanticColor } from './colors';
export type { SpacingToken, SpacingPreset } from './spacing';
export type { TypographyToken, FontSize } from './typography';
export type { ShadowToken, BorderRadiusToken } from './effects';

/**
 * Theme context: contains the active theme and theme-aware token resolver
 */
export interface ThemeContext {
  // 'light' | 'dark' | 'system' (which respects prefers-color-scheme)
  mode: 'light' | 'dark' | 'system';

  // Whether animation is reduced (respects prefers-reduced-motion)
  prefersReducedMotion: boolean;

  // Current locale for localisation
  locale: string;

  // Resolved theme tokens (color, shadow, etc.)
  // Call this to get the correct token value for the current theme
  getToken(tokenPath: string): string;
}

/**
 * Export all tokens as a flat object for easy CSS generation
 */
export const allTokens = {
  colors: require('./colors').colorTokens,
  spacing: require('./spacing').spacingTokens,
  typography: require('./typography').typographyTokens,
  shadows: require('./effects').shadowTokens,
  borderRadius: require('./effects').borderRadiusTokens,
  animations: require('./effects').animationTokens,
  zIndex: require('./effects').zIndexTokens,
} as const;
