/**
 * Keel Design System — Typography Tokens
 *
 * A limited palette of font sizes and weights designed for clarity and accessibility.
 * Supports localisation: strings can expand 1.4× without breaking layouts.
 *
 * Font stack prioritizes system fonts (fast, accessible, familiar).
 * No custom fonts ship to mobile or kiosk; only web gets optional variable fonts.
 *
 * Sizes follow a 1.25× scale (musical fourths); designed to scale smoothly
 * between mobile (base 14px) and desktop (base 16px).
 *
 * Line heights are generous (1.5–1.6) for screen readability and accessibility.
 */

export const fontStack = {
  // System font stack for optimal performance and accessibility
  // Fallbacks for different platforms ensure consistent experience
  system:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',

  // For numeric/tabular content (ensures numbers align in tables)
  monospace:
    '"SF Mono", "Monaco", "Courier New", monospace',

  // For code blocks and terminal output
  code:
    '"Fira Code", "Source Code Pro", "Courier New", monospace',
} as const;

/**
 * Font sizes: aligned to a 1.25× scale (musical fourths)
 * Mobile base: 14px, Desktop base: 16px
 */
export const typographyTokens = {
  // Tiny: form hints, captions, small badges
  xs: {
    mobile: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0.3px' },
    desktop: { fontSize: '13px', lineHeight: '16px', letterSpacing: '0.3px' },
  },

  // Small: form labels, secondary info
  sm: {
    mobile: { fontSize: '13px', lineHeight: '20px', letterSpacing: '0' },
    desktop: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0' },
  },

  // Base: default text, form inputs, descriptions
  base: {
    mobile: { fontSize: '14px', lineHeight: '22px', letterSpacing: '0' },
    desktop: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0' },
  },

  // Large: list items, table cells
  lg: {
    mobile: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0' },
    desktop: { fontSize: '18px', lineHeight: '28px', letterSpacing: '0' },
  },

  // Heading 4: subsection titles
  h4: {
    mobile: { fontSize: '18px', lineHeight: '26px', letterSpacing: '-0.4px', fontWeight: 600 },
    desktop: { fontSize: '20px', lineHeight: '28px', letterSpacing: '-0.4px', fontWeight: 600 },
  },

  // Heading 3: major subsection titles
  h3: {
    mobile: { fontSize: '20px', lineHeight: '28px', letterSpacing: '-0.4px', fontWeight: 600 },
    desktop: { fontSize: '24px', lineHeight: '32px', letterSpacing: '-0.6px', fontWeight: 600 },
  },

  // Heading 2: page section titles
  h2: {
    mobile: { fontSize: '24px', lineHeight: '32px', letterSpacing: '-0.6px', fontWeight: 700 },
    desktop: { fontSize: '28px', lineHeight: '36px', letterSpacing: '-0.8px', fontWeight: 700 },
  },

  // Heading 1: main page title
  h1: {
    mobile: { fontSize: '28px', lineHeight: '36px', letterSpacing: '-0.8px', fontWeight: 700 },
    desktop: { fontSize: '32px', lineHeight: '40px', letterSpacing: '-1px', fontWeight: 700 },
  },

  // Display: hero text, landing pages
  display: {
    mobile: { fontSize: '32px', lineHeight: '40px', letterSpacing: '-1px', fontWeight: 700 },
    desktop: { fontSize: '48px', lineHeight: '56px', letterSpacing: '-1.5px', fontWeight: 700 },
  },
} as const;

/**
 * Font weight palette: semantic, not numeric
 * Only use these; mixing adds visual noise
 */
export const fontWeights = {
  // Regular: body text, labels, descriptions
  regular: 400,

  // Medium: slightly emphasized text, table headers
  medium: 500,

  // Semibold: field labels, button text, subsection headers
  semibold: 600,

  // Bold: main headings, emphasis within text
  bold: 700,

  // Extrabold: hero text, page titles (use sparingly)
  extrabold: 800,
} as const;

/**
 * Text transform presets for common patterns
 */
export const textTransforms = {
  // Uppercase: navigation, labels, badges
  uppercase: 'uppercase',

  // Capitalize: proper nouns, titles
  capitalize: 'capitalize',

  // Lowercase: email addresses, codes
  lowercase: 'lowercase',

  // Normal: default
  none: 'none',
} as const;

/**
 * Localisation considerations:
 * - English strings can expand 1.4× when localized (e.g., German, Russian)
 * - RTL languages (Arabic, Hebrew) mirror layouts
 * - CJK languages (Chinese, Japanese, Korean) need tighter line spacing
 * - Date/time/number formatting varies by locale
 *
 * Recommended max-widths for readability:
 * - Body text: 65–75 characters (310–400px at base size)
 * - Headings: 50–60 characters
 * - Lists: 50–60 characters
 */
export const localisationSettings = {
  // String expansion factor: assume 1.4× for translations
  maxExpansion: 1.4,

  // Common locale-specific text widths
  textContainers: {
    body: 'max-width: 72ch',       // ~350px at base size
    heading: 'max-width: 50ch',    // ~240px at base size
    list: 'max-width: 55ch',       // ~265px at base size
  },

  // Date/number/time formatting by locale
  localeFormats: {
    en: { date: 'MM/DD/YYYY', time: '12-hour', numberSeparator: '.' },
    de: { date: 'DD.MM.YYYY', time: '24-hour', numberSeparator: ',' },
    fr: { date: 'DD/MM/YYYY', time: '24-hour', numberSeparator: ',' },
    ja: { date: 'YYYY/MM/DD', time: '24-hour', numberSeparator: '.' },
    ar: { date: 'DD/MM/YYYY', time: '24-hour', numberSeparator: ',' },
  },

  // Name order by locale (affects form input labels)
  nameOrder: {
    en: ['firstName', 'lastName'],
    ja: ['lastName', 'firstName'],
    ko: ['lastName', 'firstName'],
    ar: ['firstName', 'lastName'],
  },

  // RTL languages that need layout mirroring
  rtlLanguages: ['ar', 'he', 'ur'],
} as const;

// Type definitions
export type TypographyToken = keyof typeof typographyTokens;
export type FontSize = typeof typographyTokens[TypographyToken];
