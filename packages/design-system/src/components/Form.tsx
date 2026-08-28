/**
 * Form Components
 *
 * A suite of form components including:
 * - Form: wrapper component for managing form state and submission
 * - FormField: combines label, input, error message, and helper text
 * - FormSubmit: submit button with loading state handling
 *
 * Full WCAG 2.2 AA compliance with accessibility annotations
 * Light/dark theme support
 * Responsive for all layouts
 */

import React, { forwardRef, ReactNode, FormEvent } from 'react';
import { Input, InputProps } from './Input';
import { Button, ButtonProps } from './Button';
import clsx from 'clsx';

/**
 * Form wrapper component
 * Manages form submission and provides context for field validation
 */
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Form submission handler */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  /** Show loading state while form is submitting */
  isSubmitting?: boolean;
  /** Layout direction */
  layout?: 'vertical' | 'horizontal';
  /** Spacing between fields */
  spacing?: 'sm' | 'md' | 'lg';
}

const Form = forwardRef<HTMLFormElement, FormProps>(
  (
    {
      onSubmit,
      isSubmitting = false,
      layout = 'vertical',
      spacing = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const spacingMap = {
      sm: 'gap-sm',
      md: 'gap-md',
      lg: 'gap-lg',
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (onSubmit && !isSubmitting) {
        await onSubmit(e);
      }
    };

    return (
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className={clsx(
          'flex flex-col',
          spacingMap[spacing],
          className
        )}
        aria-busy={isSubmitting}
        {...props}
      >
        {children}
      </form>
    );
  }
);

Form.displayName = 'Form';

/**
 * FormField component
 * Combines label, input, error message, and helper text
 */
interface FormFieldProps extends Omit<InputProps, 'inputState'> {
  /** Field name for form submission */
  name: string;
  /** Validation error message */
  error?: string;
  /** Whether field is required */
  isRequired?: boolean;
  /** Custom component instead of Input */
  render?: (props: any) => ReactNode;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      name,
      label,
      error,
      isRequired = false,
      helperText,
      render,
      className,
      ...props
    },
    ref
  ) => {
    const fieldId = props.id || `field-${name}`;

    if (render) {
      return (
        <div className={clsx('w-full flex flex-col gap-sm', className)}>
          {label && (
            <label
              htmlFor={fieldId}
              className={clsx(
                'text-sm font-medium',
                'text-neutral-950 dark:text-neutral-50'
              )}
            >
              {label}
              {isRequired && (
                <span className="ml-xs text-error-500 dark:text-error-400">
                  *
                </span>
              )}
            </label>
          )}
          {render({ id: fieldId, name, ...props })}
          {error && (
            <p
              className="text-xs text-error-600 dark:text-error-400"
              role="alert"
            >
              {error}
            </p>
          )}
          {helperText && !error && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {helperText}
            </p>
          )}
        </div>
      );
    }

    return (
      <Input
        ref={ref}
        id={fieldId}
        name={name}
        label={label}
        error={error}
        isRequired={isRequired}
        helperText={helperText}
        inputState={error ? 'error' : 'default'}
        className={className}
        {...props}
      />
    );
  }
);

FormField.displayName = 'FormField';

/**
 * FormSubmit component
 * Submit button with loading state handling
 */
interface FormSubmitProps extends Omit<ButtonProps, 'type'> {
  /** Loading state */
  isLoading?: boolean;
}

const FormSubmit = forwardRef<HTMLButtonElement, FormSubmitProps>(
  ({ isLoading = false, children = 'Submit', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type="submit"
        isLoading={isLoading}
        disabled={isLoading}
        variant="primary"
        {...props}
      >
        {children}
      </Button>
    );
  }
);

FormSubmit.displayName = 'FormSubmit';

export { Form, FormField, FormSubmit };
export type { FormProps, FormFieldProps, FormSubmitProps };
