/**
 * Tailwind CSS Configuration for Keel Design System
 *
 * This file maps Keel DS tokens to Tailwind's theming system,
 * enabling consistent use of tokens across all components.
 */

const colors = require('./dist/tokens/colors').colorTokens;
const spacing = require('./dist/tokens/spacing').spacingTokens;

module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Flatten color tokens for Tailwind
        neutral: colors.neutral,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        brand: colors.brand,
        accent: colors.accent,
      },
      spacing: spacing,
      fontSize: {
        xs: ['13px', { lineHeight: '16px', letterSpacing: '0.3px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        h4: ['20px', { lineHeight: '28px', fontWeight: 600 }],
        h3: ['24px', { lineHeight: '32px', fontWeight: 600 }],
        h2: ['28px', { lineHeight: '36px', fontWeight: 700 }],
        h1: ['32px', { lineHeight: '40px', fontWeight: 700 }],
        display: ['48px', { lineHeight: '56px', fontWeight: 700 }],
      },
      fontFamily: {
        system: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Roboto"',
          '"Oxygen"',
          '"Ubuntu"',
          '"Cantarell"',
          '"Fira Sans"',
          '"Droid Sans"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        monospace: ['"SF Mono"', '"Monaco"', '"Courier New"', 'monospace'],
        code: ['"Fira Code"', '"Source Code Pro"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
        full: '9999px',
      },
      transitionDuration: {
        instant: '0ms',
        fast: '200ms',
        normal: '300ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.7, 0, 0.84, 0)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        linear: 'linear',
      },
      zIndex: {
        base: '0',
        dropdown: '100',
        sticky: '200',
        overlay: '1000',
        modal: '1100',
        popover: '1050',
        tooltip: '1000',
        alert: '2000',
        notification: '2000',
        banner: '2000',
      },
    },
  },
  plugins: [
    // Plugin for responsive utilities
    function ({ addUtilities }) {
      addUtilities({
        '.duration-instant': { '--tw-duration': '0ms' },
        '.duration-fast': { '--tw-duration': '200ms' },
        '.duration-normal': { '--tw-duration': '300ms' },
        '.duration-slow': { '--tw-duration': '400ms' },
        '.easing-out': { '--tw-timing-function': 'cubic-bezier(0.16, 1, 0.3, 1)' },
        '.easing-in': { '--tw-timing-function': 'cubic-bezier(0.7, 0, 0.84, 0)' },
        '.easing-in-out': { '--tw-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)' },
      });
    },
  ],
};
