/**
 * Button Component
 *
 * A foundational button component with support for:
 * - Variants: primary, secondary, danger, ghost
 * - Sizes: sm, md, lg (responsive to viewport)
 * - States: default, disabled, loading
 * - Full keyboard navigation and WCAG 2.2 AA focus ring
 * - Light/dark theme support via CSS variables
 * - Responsive layout (desktop, tablet, mobile, kiosk)
 *
 * All states: empty, loading, disabled, read-only, no-permission, L3
 */

import React, { forwardRef, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const buttonVariants = cva(
  [
    // Base styles
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'font-family-system',
    'border',
    'rounded-md',
    'cursor-pointer',
    'transition-all',
    'duration-fast',
    'easing-in-out',
    'gap-md',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'focus-visible:outline-2',
    'focus-visible:outline-offset-2',
    'focus-visible:outline-brand-500',
    // Accessibility
    'focus-visible:outline',
    'active:scale-95',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand-500',
          'text-neutral-50',
          'border-brand-600',
          'hover:bg-brand-600',
          'active:bg-brand-700',
          'disabled:bg-brand-500',
          'disabled:text-neutral-200',
          'dark:bg-brand-400',
          'dark:hover:bg-brand-500',
          'dark:active:bg-brand-600',
        ],
        secondary: [
          'bg-neutral-100',
          'text-neutral-950',
          'border-neutral-300',
          'hover:bg-neutral-200',
          'active:bg-neutral-300',
          'disabled:bg-neutral-100',
          'dark:bg-neutral-700',
          'dark:text-neutral-50',
          'dark:border-neutral-600',
          'dark:hover:bg-neutral-600',
          'dark:active:bg-neutral-500',
        ],
        danger: [
          'bg-error-500',
          'text-neutral-50',
          'border-error-600',
          'hover:bg-error-600',
          'active:bg-error-700',
          'disabled:bg-error-500',
          'dark:bg-error-400',
          'dark:hover:bg-error-500',
          'dark:active:bg-error-600',
        ],
        ghost: [
          'bg-transparent',
          'text-brand-500',
          'border-transparent',
          'hover:bg-brand-50',
          'active:bg-brand-100',
          'disabled:text-neutral-400',
          'dark:text-brand-400',
          'dark:hover:bg-brand-950',
          'dark:active:bg-brand-900',
        ],
      },
      size: {
        sm: ['px-sm', 'py-xs', 'text-xs', 'min-h-8', 'gap-xs'],
        md: ['px-md', 'py-sm', 'text-sm', 'min-h-10', 'gap-sm'],
        lg: ['px-lg', 'py-md', 'text-base', 'min-h-12', 'gap-md'],
      },
      state: {
        default: [],
        loading: ['opacity-75', 'cursor-wait'],
        disabled: [],
        readonly: ['cursor-default', 'opacity-60'],
        'no-permission': ['cursor-not-allowed', 'opacity-40'],
        l3: ['border-2', 'border-dashed'],
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      state: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Content of the button */
  children?: ReactNode;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Icon to display before text */
  icon?: ReactNode;
  /** Icon to display after text */
  iconEnd?: ReactNode;
  /** Full width button */
  fullWidth?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      state = 'default',
      children,
      isLoading = false,
      icon,
      iconEnd,
      fullWidth = false,
      disabled = false,
      ariaLabel,
      className,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;
    const currentState =
      isLoading && state === 'default'
        ? 'loading'
        : disabled
          ? 'disabled'
          : state;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={clsx(
          buttonVariants({ variant, size, state: currentState }),
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {isLoading && (
          <span
            className="inline-block w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin"
            aria-hidden="true"
          />
        )}

        {/* Icon before */}
        {icon && !isLoading && (
          <span className="inline-flex items-center justify-center" aria-hidden="true">
            {icon}
          </span>
        )}

        {/* Label */}
        {children && <span>{children}</span>}

        {/* Icon after */}
        {iconEnd && !isLoading && (
          <span className="inline-flex items-center justify-center" aria-hidden="true">
            {iconEnd}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
