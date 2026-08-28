/**
 * Keel Design System — Spacing Tokens
 *
 * Based on 4px grid. Tokens follow a doubling scale to minimize choices.
 * Used for padding, margin, gaps, and component sizing.
 *
 * Design principle: Every decision should have exactly one right answer.
 * Too many choices leads to inconsistency.
 *
 * Naming: xs, sm, md, lg, xl, 2xl, 3xl, 4xl
 * Also includes numeric tokens for precise layouts (e.g., "space-2" = 8px)
 */

export const spacingTokens = {
  // Zero (explicit, not implicit)
  0: '0px',

  // Micro (for tight spacing)
  xs: '4px',  // Between icon and text, tight borders
  sm: '8px',  // Padding in compact inputs, spacing between labels
  md: '12px', // Default padding for compact components
  lg: '16px', // Standard padding for buttons, cards
  xl: '24px', // Space between sections on mobile
  '2xl': '32px', // Space between major sections
  '3xl': '48px', // Space between columns on desktop
  '4xl': '64px', // Space between major sections on desktop

  // Numeric scale (for precision)
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
  40: '160px',
  48: '192px',
  56: '224px',
  64: '256px',
} as const;

/**
 * Component-specific spacing presets
 * These are the canonical sizes; always prefer these over custom spacings
 */
export const spacingPresets = {
  button: {
    sm: {
      padding: '6px 12px',    // 24px height with icon
      gap: '4px',
    },
    md: {
      padding: '8px 16px',    // 32px height (default)
      gap: '8px',
    },
    lg: {
      padding: '12px 24px',   // 40px height (prominent)
      gap: '12px',
    },
  },

  input: {
    padding: '8px 12px',      // 32px height
    gap: '8px',               // Icon-to-text gap
  },

  card: {
    padding: '16px',          // Mobile
    mobileGap: '8px',
    desktopPadding: '24px',   // Desktop
    desktopGap: '12px',
  },

  form: {
    fieldGap: '4px',          // Label-to-input gap
    sectionGap: '24px',       // Between form sections (mobile)
    desktopSectionGap: '32px',
  },

  modal: {
    padding: '24px',          // All sides
    headerPadding: '24px',
    footerPadding: '16px 24px',
    bodyGap: '16px',
  },

  topNav: {
    height: '56px',
    padding: '8px 16px',
    itemGap: '8px',
  },

  bottomSheet: {
    padding: '16px',
    handleHeight: '4px',
    handleMargin: '8px',
  },

  sidebar: {
    padding: '16px',
    itemGap: '4px',
  },

  table: {
    cellPadding: '12px',
    rowGap: '0px',
    headerPadding: '12px 16px',
  },

  // Touch targets: minimum 44px for mobile, 48dp for kiosk
  touchTarget: {
    mobile: '44px',
    kiosk: '48px',
    desktop: '32px',
  },
} as const;

// Type definitions
export type SpacingToken = keyof typeof spacingTokens;
export type SpacingPreset = keyof typeof spacingPresets;
