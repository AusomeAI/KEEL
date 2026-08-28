/**
 * Keel Design System — Effects Tokens
 *
 * Shadows, animations, and border radius designed to support light and dark modes
 * without compromising readability or performance.
 *
 * Shadows: subtle, used to create depth and hierarchy, not flashiness.
 * Animations: fast (200–400ms), purposeful, not decorative.
 * Border radius: consistent scale, matches touch target sizes.
 */

/**
 * Shadow scale: from subtle to dramatic
 * Each shadow works in both light and dark modes (adjusted at runtime)
 *
 * Principle: shadows should separate layers, not distract.
 * Only apply shadows to interactive elements, cards, and modals.
 */
export const shadowTokens = {
  // No shadow (explicit)
  none: 'none',

  // Sm: subtle elevation, used for hover states on buttons
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

  // Base: default elevation for cards, dropdowns
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',

  // Md: medium elevation for modals, popovers
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',

  // Lg: prominent elevation for bottom sheets, full-screen overlays
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',

  // Xl: maximum elevation for top-level surfaces
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',

  // Focus ring: for keyboard focus (not a shadow, but similar effect)
  focus: '0 0 0 3px rgba(99, 102, 241, 0.5)',  // Indigo with transparency
  focusError: '0 0 0 3px rgba(239, 68, 68, 0.5)',
  focusSuccess: '0 0 0 3px rgba(34, 197, 94, 0.5)',
} as const;

/**
 * Border radius scale
 * Consistent sizing: xs, sm, md, lg, xl (full)
 * Used for buttons, inputs, cards, modals
 */
export const borderRadiusTokens = {
  // No radius (buttons with full-height background)
  none: '0px',

  // Tiny: rarely used, only for tight components
  xs: '2px',

  // Small: inputs, small buttons, badges
  sm: '4px',

  // Default: buttons, cards, popovers
  md: '6px',

  // Large: modals, large cards
  lg: '8px',

  // Extra-large: full-width modals on mobile
  xl: '12px',

  // Full: pills, rounded buttons
  full: '9999px',

  // Component-specific presets
  components: {
    button: '6px',           // md
    input: '6px',            // md
    card: '8px',             // lg
    modal: '12px',           // xl
    badge: '4px',            // sm
    chip: '6px',             // md
    avatar: '9999px',        // full
  },
} as const;

/**
 * Animation / Transition timing
 *
 * Fast: 200ms for hover, focus, small state changes
 * Normal: 300ms for modal opens, page transitions
 * Slow: 400ms for complex animations, full-page transitions
 *
 * Easing: consistent throughout the system
 * ease-out: fast entry (user sees it immediately)
 * ease-in: slow exit (feels smooth)
 * ease-in-out: general purpose
 */
export const animationTokens = {
  // Durations
  durations: {
    instant: '0ms',
    fast: '200ms',
    normal: '300ms',
    slow: '400ms',
  },

  // Easing functions
  easings: {
    // For entering, should feel responsive
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',

    // For exiting, should feel smooth
    easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',

    // General purpose
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Linear: for progress bars, spinners
    linear: 'linear',
  },

  // Common transitions (combine duration + easing)
  transitions: {
    // Quick hover/focus feedback
    quick: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',

    // Standard state change
    standard: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',

    // Smooth exit
    smooth: 'all 300ms cubic-bezier(0.7, 0, 0.84, 0)',

    // Property-specific
    color: 'color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    background: 'background-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    transform: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    opacity: 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // Keyframe animations
  animations: {
    // Spinner: continuous rotation
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
      duration: '1s',
      iterationCount: 'infinite',
      timingFunction: 'linear',
    },

    // Pulse: gentle opacity pulse for loading states
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
      duration: '2s',
      iterationCount: 'infinite',
      timingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },

    // Slide-down: for dropdowns, modals
    slideDown: {
      from: { opacity: '0', transform: 'translateY(-10px)' },
      to: { opacity: '1', transform: 'translateY(0)' },
      duration: '200ms',
      timingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },

    // Fade: for modals, overlays
    fadeIn: {
      from: { opacity: '0' },
      to: { opacity: '1' },
      duration: '300ms',
      timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },

    // Bounce: for notifications, attention
    bounce: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-4px)' },
      duration: '200ms',
      iterationCount: 'infinite',
      timingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },

  // When NOT to animate (accessibility)
  reducedMotion: 'prefers-reduced-motion: reduce',
} as const;

/**
 * Z-index scale: semantic, not numeric
 * Prevents z-index wars; always use these tokens
 */
export const zIndexTokens = {
  // Base layers (content)
  base: 0,
  dropdown: 100,
  sticky: 200,

  // Overlays and modals
  overlay: 1000,
  modal: 1100,
  popover: 1050,
  tooltip: 1000,

  // Top layer (notifications, alerts)
  alert: 2000,
  notification: 2000,
  banner: 2000,

  // Debug layer (remove in production)
  debug: 9999,
} as const;

// Type definitions
export type ShadowToken = keyof typeof shadowTokens;
export type BorderRadiusToken = keyof typeof borderRadiusTokens;
export type AnimationToken = keyof typeof animationTokens;
export type ZIndexToken = keyof typeof zIndexTokens;
