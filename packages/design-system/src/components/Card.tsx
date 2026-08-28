/**
 * Card Component
 *
 * A container component for organizing content with:
 * - Optional header and footer sections
 * - Responsive padding based on design tokens
 * - Shadow and border styling
 * - All responsive layouts: desktop, tablet, mobile, kiosk
 * - States: default, loading, empty, error
 * - Light/dark theme support
 */

import React, { forwardRef, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const cardVariants = cva(
  [
    // Base styles
    'bg-neutral-50',
    'border',
    'border-neutral-200',
    'rounded-lg',
    'overflow-hidden',
    'transition-all',
    'duration-fast',
    'dark:bg-neutral-900',
    'dark:border-neutral-700',
  ],
  {
    variants: {
      variant: {
        default: ['shadow-base'],
        elevated: ['shadow-md', 'hover:shadow-lg'],
        outlined: ['border-2', 'border-neutral-300', 'dark:border-neutral-600'],
      },
      state: {
        default: [],
        loading: ['opacity-75', 'pointer-events-none'],
        empty: [],
        error: ['border-error-300', 'dark:border-error-600'],
        l3: ['border-2', 'border-dashed', 'border-brand-500'],
      },
    },
    defaultVariants: {
      variant: 'default',
      state: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Content of the card body */
  children?: ReactNode;
  /** Optional header content */
  header?: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Show loading overlay */
  isLoading?: boolean;
  /** Padding size for body */
  padding?: 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      header,
      footer,
      isLoading = false,
      padding = 'md',
      variant = 'default',
      state = 'default',
      className,
      ...props
    },
    ref
  ) => {
    const paddingMap = {
      sm: 'p-sm',
      md: 'p-md',
      lg: 'p-lg',
    };

    const headerPaddingMap = {
      sm: 'px-sm py-xs',
      md: 'px-md py-sm',
      lg: 'px-lg py-md',
    };

    const currentState = isLoading ? 'loading' : state;

    return (
      <div
        ref={ref}
        className={clsx(
          cardVariants({ variant, state: currentState }),
          className
        )}
        aria-busy={isLoading}
        {...props}
      >
        {/* Header */}
        {header && (
          <div
            className={clsx(
              headerPaddingMap[padding],
              'border-b',
              'border-neutral-200',
              'dark:border-neutral-700',
              'bg-neutral-50',
              'dark:bg-neutral-800'
            )}
          >
            {header}
          </div>
        )}

        {/* Body */}
        <div className={clsx(paddingMap[padding], 'relative')}>
          {children}

          {/* Loading overlay */}
          {isLoading && (
            <div
              className={clsx(
                'absolute inset-0',
                'flex items-center justify-center',
                'bg-neutral-50 bg-opacity-50',
                'dark:bg-neutral-900 dark:bg-opacity-50',
                'backdrop-blur-sm'
              )}
              aria-hidden="true"
            >
              <div
                className={clsx(
                  'w-8 h-8',
                  'border-4 border-brand-300 dark:border-brand-700',
                  'border-t-brand-500 dark:border-t-brand-400',
                  'rounded-full',
                  'animate-spin'
                )}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={clsx(
              headerPaddingMap[padding],
              'border-t',
              'border-neutral-200',
              'dark:border-neutral-700',
              'bg-neutral-50',
              'dark:bg-neutral-800'
            )}
          >
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card, cardVariants };
