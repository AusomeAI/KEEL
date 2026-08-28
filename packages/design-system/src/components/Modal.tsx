/**
 * Modal Component
 *
 * A dialog modal component with:
 * - Radix Dialog primitive for accessibility
 * - Focus trap and keyboard support (Escape to close)
 * - Backdrop click support
 * - Header, body, and footer sections
 * - Close button
 * - Full WCAG 2.2 AA compliance
 * - Light/dark theme support
 * - Responsive sizing for all layouts
 */

import React, { forwardRef, ReactNode, useRef, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';

export interface ModalProps {
  /** Modal open state */
  open?: boolean;
  /** Callback when modal should close */
  onOpenChange?: (open: boolean) => void;
  /** Modal title */
  title?: ReactNode;
  /** Modal content */
  children?: ReactNode;
  /** Footer content (typically action buttons) */
  footer?: ReactNode;
  /** Hide close button */
  hideCloseButton?: boolean;
  /** Allow closing by clicking backdrop */
  closeOnBackdropClick?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Aria label for dialog */
  ariaLabel?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading state */
  isLoading?: boolean;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open = false,
      onOpenChange,
      title,
      children,
      footer,
      hideCloseButton = false,
      closeOnBackdropClick = true,
      className,
      ariaLabel,
      size = 'md',
      isLoading = false,
    },
    ref
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);

    const sizeMap = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
    };

    return (
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        {/* Backdrop overlay */}
        <Dialog.Portal>
          <Dialog.Overlay
            className={clsx(
              'fixed inset-0',
              'bg-neutral-950 bg-opacity-50',
              'dark:bg-neutral-950 dark:bg-opacity-70',
              'data-[state=open]:animate-in',
              'data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0',
              'data-[state=open]:fade-in-0',
              'z-modal'
            )}
            onClick={(e) => {
              if (closeOnBackdropClick) {
                onOpenChange?.(false);
              }
            }}
          />

          {/* Modal content */}
          <Dialog.Content
            ref={ref}
            className={clsx(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'z-modal+100',
              'w-full',
              'mx-md',
              sizeMap[size],
              'bg-neutral-50',
              'dark:bg-neutral-800',
              'border',
              'border-neutral-200',
              'dark:border-neutral-700',
              'rounded-lg',
              'shadow-lg',
              'data-[state=open]:animate-in',
              'data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0',
              'data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95',
              'data-[state=open]:zoom-in-95',
              'data-[state=closed]:slide-out-to-left-1/2',
              'data-[state=closed]:slide-out-to-top-[48%]',
              'data-[state=open]:slide-in-from-left-1/2',
              'data-[state=open]:slide-in-from-top-[48%]',
              'overflow-hidden',
              className
            )}
            aria-label={ariaLabel}
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={children ? 'modal-description' : undefined}
            aria-busy={isLoading}
          >
            {/* Header */}
            {title && (
              <div
                className={clsx(
                  'px-lg py-md',
                  'border-b',
                  'border-neutral-200',
                  'dark:border-neutral-700',
                  'bg-neutral-50',
                  'dark:bg-neutral-800',
                  'flex items-center justify-between'
                )}
              >
                <h2
                  id="modal-title"
                  className={clsx(
                    'text-lg font-semibold',
                    'text-neutral-950',
                    'dark:text-neutral-50'
                  )}
                >
                  {title}
                </h2>

                {!hideCloseButton && (
                  <Dialog.Close
                    className={clsx(
                      'inline-flex items-center justify-center',
                      'w-8 h-8',
                      'text-neutral-600',
                      'dark:text-neutral-400',
                      'hover:bg-neutral-100',
                      'dark:hover:bg-neutral-700',
                      'rounded-md',
                      'transition-colors',
                      'focus-visible:outline-2',
                      'focus-visible:outline-offset-2',
                      'focus-visible:outline-brand-500'
                    )}
                    aria-label="Close modal"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 4L4 12M4 4L12 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Dialog.Close>
                )}
              </div>
            )}

            {/* Body */}
            <div
              id="modal-description"
              className={clsx(
                'px-lg py-md',
                'text-neutral-950',
                'dark:text-neutral-50',
                'relative',
                isLoading && 'opacity-50 pointer-events-none'
              )}
            >
              {children}

              {/* Loading overlay */}
              {isLoading && (
                <div
                  className={clsx(
                    'absolute inset-0',
                    'flex items-center justify-center',
                    'bg-neutral-50 bg-opacity-50',
                    'dark:bg-neutral-800 dark:bg-opacity-50'
                  )}
                  aria-hidden="true"
                >
                  <div
                    className={clsx(
                      'w-8 h-8',
                      'border-4',
                      'border-brand-300',
                      'dark:border-brand-700',
                      'border-t-brand-500',
                      'dark:border-t-brand-400',
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
                  'px-lg py-md',
                  'border-t',
                  'border-neutral-200',
                  'dark:border-neutral-700',
                  'bg-neutral-50',
                  'dark:bg-neutral-800',
                  'flex items-center justify-end gap-md'
                )}
              >
                {footer}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }
);

Modal.displayName = 'Modal';

export { Modal, Dialog };
