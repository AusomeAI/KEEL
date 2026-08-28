/**
 * Input Component
 *
 * A text input component supporting:
 * - Types: text, email, password, number, date, search, tel
 * - States: default, error, disabled, read-only, no-permission, L3
 * - Labels and helper text
 * - Placeholder text
 * - Error messages with semantic coloring
 * - Full keyboard support and WCAG 2.2 AA
 * - Light/dark theme support
 *
 * All form factor layouts: desktop, tablet, mobile, kiosk
 */

import React, { forwardRef, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const inputVariants = cva(
  [
    // Base styles
    'w-full',
    'px-md',
    'py-sm',
    'font-base',
    'font-system',
    'bg-neutral-50',
    'border',
    'border-neutral-300',
    'text-neutral-950',
    'rounded-md',
    'transition-colors',
    'duration-fast',
    'placeholder:text-neutral-400',
    'focus-visible:outline-2',
    'focus-visible:outline-offset-0',
    'focus-visible:outline-brand-500',
    'focus-visible:border-brand-500',
    'disabled:bg-neutral-100',
    'disabled:text-neutral-400',
    'disabled:cursor-not-allowed',
    'dark:bg-neutral-800',
    'dark:border-neutral-600',
    'dark:text-neutral-50',
    'dark:placeholder:text-neutral-500',
    'dark:focus-visible:outline-brand-400',
    'dark:focus-visible:border-brand-400',
  ],
  {
    variants: {
      state: {
        default: ['border-neutral-300', 'dark:border-neutral-600'],
        error: ['border-error-500', 'dark:border-error-400'],
        readonly: [
          'bg-neutral-50',
          'cursor-default',
          'dark:bg-neutral-900',
        ],
        'no-permission': ['opacity-50', 'cursor-not-allowed'],
        l3: ['border-2', 'border-dashed'],
      },
      size: {
        sm: ['px-sm', 'py-xs', 'text-xs', 'min-h-8'],
        md: ['px-md', 'py-sm', 'text-sm', 'min-h-10'],
        lg: ['px-lg', 'py-md', 'text-base', 'min-h-12'],
      },
    },
    defaultVariants: {
      state: 'default',
      size: 'md',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  /** Label for the input */
  label?: ReactNode;
  /** Helper text displayed below the input */
  helperText?: ReactNode;
  /** Error message when validation fails */
  error?: ReactNode;
  /** Required indicator */
  isRequired?: boolean;
  /** Show required asterisk */
  showRequired?: boolean;
  /** Input state */
  inputState?: 'default' | 'error' | 'readonly' | 'no-permission' | 'l3';
  /** Icon to display at start of input */
  iconStart?: ReactNode;
  /** Icon to display at end of input */
  iconEnd?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      isRequired = false,
      showRequired = true,
      inputState = 'default',
      size = 'md',
      state = 'default',
      iconStart,
      iconEnd,
      id,
      className,
      readOnly,
      disabled,
      ...props
    },
    ref
  ) => {
    // Determine actual state based on error, disabled, readonly
    const actualState = error
      ? 'error'
      : readOnly
        ? 'readonly'
        : disabled
          ? 'default'
          : inputState;

    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const helperTextId = `helper-${inputId}`;
    const errorId = `error-${inputId}`;

    return (
      <div className="w-full flex flex-col gap-sm">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'text-sm font-medium text-neutral-950',
              'dark:text-neutral-50',
              disabled && 'opacity-60 dark:opacity-60'
            )}
          >
            {label}
            {isRequired && showRequired && (
              <span
                className="ml-xs text-error-500 dark:text-error-400"
                aria-label="required"
              >
                *
              </span>
            )}
          </label>
        )}

        {/* Input wrapper with icons */}
        <div className="relative flex items-center">
          {/* Start icon */}
          {iconStart && (
            <span
              className={clsx(
                'absolute left-md text-neutral-400 dark:text-neutral-500',
                'pointer-events-none'
              )}
              aria-hidden="true"
            >
              {iconStart}
            </span>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            readOnly={readOnly}
            aria-disabled={disabled}
            aria-readonly={readOnly}
            aria-required={isRequired}
            aria-invalid={!!error}
            aria-describedby={clsx(
              helperText && helperTextId,
              error && errorId
            )}
            className={clsx(
              inputVariants({ state: actualState, size }),
              iconStart && 'pl-2xl',
              iconEnd && 'pr-2xl',
              className
            )}
            {...props}
          />

          {/* End icon */}
          {iconEnd && (
            <span
              className={clsx(
                'absolute right-md text-neutral-400 dark:text-neutral-500',
                'pointer-events-none'
              )}
              aria-hidden="true"
            >
              {iconEnd}
            </span>
          )}
        </div>

        {/* Helper text */}
        {helperText && !error && (
          <p
            id={helperTextId}
            className="text-xs text-neutral-600 dark:text-neutral-400"
          >
            {helperText}
          </p>
        )}

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="text-xs text-error-600 dark:text-error-400"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
