/**
 * Keel Design System v1
 *
 * A production-grade, accessible design system built on:
 * - Radix UI primitives (semantic, unstyled foundations)
 * - Class Variance Authority (CVA) for component variants
 * - Design tokens (colors, spacing, typography, effects)
 * - CSS variables for theme switching (no JS required)
 *
 * All components include:
 * - WCAG 2.2 AA accessibility (contrast, keyboard, screen reader)
 * - Light/dark theme support via CSS variables
 * - Responsive layouts (desktop, tablet, mobile, kiosk)
 * - All required states (empty, loading, error, offline, read-only, no-permission, L3)
 * - Full TypeScript support with JSDoc documentation
 * - Localization-ready (string expansion, RTL support)
 */

// Re-export all tokens
export * from './tokens';

// Re-export all components
export * from './components';

// Version
export const VERSION = '1.0.0';
export const DESIGN_SYSTEM_NAME = 'Keel DS';
