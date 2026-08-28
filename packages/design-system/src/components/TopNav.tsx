/**
 * TopNav Component
 *
 * A top navigation bar with:
 * - Logo/branding area
 * - Breadcrumbs for navigation context
 * - Context switcher (Tenant/Group/Entity/Branch)
 * - User profile menu
 * - Theme toggle
 * - Responsive layout for all form factors
 * - Full keyboard navigation
 * - WCAG 2.2 AA compliance
 * - Light/dark theme support
 */

import React, { forwardRef, ReactNode, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import clsx from 'clsx';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  current?: boolean;
}

export interface ContextItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface TopNavProps {
  /** Logo/branding element */
  logo?: ReactNode;
  /** Breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];
  /** Current tenant */
  currentTenant?: ContextItem;
  /** Available tenants */
  tenants?: ContextItem[];
  /** Tenant change handler */
  onTenantChange?: (tenantId: string) => void;
  /** Current group */
  currentGroup?: ContextItem;
  /** Available groups */
  groups?: ContextItem[];
  /** Group change handler */
  onGroupChange?: (groupId: string) => void;
  /** Current entity */
  currentEntity?: ContextItem;
  /** Available entities */
  entities?: ContextItem[];
  /** Entity change handler */
  onEntityChange?: (entityId: string) => void;
  /** Current branch */
  currentBranch?: ContextItem;
  /** Available branches */
  branches?: ContextItem[];
  /** Branch change handler */
  onBranchChange?: (branchId: string) => void;
  /** User name */
  userName?: string;
  /** User avatar */
  userAvatar?: ReactNode;
  /** User menu items */
  userMenu?: { label: ReactNode; onClick: () => void }[];
  /** Current theme */
  theme?: 'light' | 'dark';
  /** Theme change handler */
  onThemeChange?: (theme: 'light' | 'dark') => void;
  /** Right-side action buttons */
  actions?: ReactNode;
  /** Show context switcher */
  showContextSwitcher?: boolean;
  /** Show breadcrumbs */
  showBreadcrumbs?: boolean;
}

const TopNav = forwardRef<HTMLDivElement, TopNavProps>(
  (
    {
      logo,
      breadcrumbs,
      currentTenant,
      tenants,
      onTenantChange,
      currentGroup,
      groups,
      onGroupChange,
      currentEntity,
      entities,
      onEntityChange,
      currentBranch,
      branches,
      onBranchChange,
      userName,
      userAvatar,
      userMenu,
      theme = 'light',
      onThemeChange,
      actions,
      showContextSwitcher = true,
      showBreadcrumbs = true,
    },
    ref
  ) => {
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    const ContextSelector = ({
      label,
      current,
      items,
      onChange,
    }: {
      label: string;
      current?: ContextItem;
      items?: ContextItem[];
      onChange?: (id: string) => void;
    }) => {
      if (!items || items.length === 0) return null;

      return (
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className={clsx(
                'px-md py-sm text-sm font-medium',
                'text-neutral-700 dark:text-neutral-300',
                'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                'border border-neutral-200 dark:border-neutral-600',
                'rounded-md transition-colors',
                'flex items-center gap-xs'
              )}
              aria-label={`Select ${label}`}
            >
              <span className="truncate">{current?.label || label}</span>
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </Popover.Trigger>

          <Popover.Content
            className={clsx(
              'w-56 p-md',
              'bg-neutral-50 dark:bg-neutral-800',
              'border border-neutral-200 dark:border-neutral-700',
              'rounded-md shadow-lg',
              'z-popover'
            )}
          >
            <div className="space-y-xs max-h-64 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onChange?.(item.id);
                    setOpenPopover(null);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-md px-md py-sm text-left text-sm rounded-md transition-colors',
                    current?.id === item.id
                      ? 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  )}
                  role="menuitem"
                  aria-current={current?.id === item.id ? 'true' : 'false'}
                >
                  {item.icon && (
                    <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </Popover.Content>
        </Popover.Root>
      );
    };

    return (
      <header
        ref={ref}
        className={clsx(
          'sticky top-0 z-sticky',
          'bg-neutral-50 dark:bg-neutral-900',
          'border-b border-neutral-200 dark:border-neutral-700',
          'h-16 md:h-20'
        )}
      >
        {/* Main navigation bar */}
        <div className="h-16 px-md md:px-lg flex items-center justify-between gap-lg">
          {/* Left: Logo + Breadcrumbs */}
          <div className="flex items-center gap-lg flex-1 min-w-0">
            {logo && <div className="flex-shrink-0">{logo}</div>}

            {showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
              <nav
                className="hidden md:flex items-center gap-xs text-sm text-neutral-600 dark:text-neutral-400"
                aria-label="Breadcrumb"
              >
                {breadcrumbs.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-xs">
                    {idx > 0 && <span>/</span>}
                    {item.current ? (
                      <span className="text-neutral-950 dark:text-neutral-50 font-medium">
                        {item.label}
                      </span>
                    ) : (
                      <button
                        onClick={item.onClick}
                        className="hover:text-neutral-950 dark:hover:text-neutral-50 transition-colors"
                      >
                        {item.label}
                      </button>
                    )}
                  </div>
                ))}
              </nav>
            )}
          </div>

          {/* Center: Context Switchers */}
          {showContextSwitcher && (
            <div className="hidden lg:flex items-center gap-sm flex-wrap justify-center">
              {currentTenant && tenants && (
                <ContextSelector
                  label="Tenant"
                  current={currentTenant}
                  items={tenants}
                  onChange={onTenantChange}
                />
              )}
              {currentGroup && groups && (
                <ContextSelector
                  label="Group"
                  current={currentGroup}
                  items={groups}
                  onChange={onGroupChange}
                />
              )}
              {currentEntity && entities && (
                <ContextSelector
                  label="Entity"
                  current={currentEntity}
                  items={entities}
                  onChange={onEntityChange}
                />
              )}
              {currentBranch && branches && (
                <ContextSelector
                  label="Branch"
                  current={currentBranch}
                  items={branches}
                  onChange={onBranchChange}
                />
              )}
            </div>
          )}

          {/* Right: Actions, Theme Toggle, User Menu */}
          <div className="flex items-center gap-md flex-shrink-0">
            {actions}

            {/* Theme toggle */}
            {onThemeChange && (
              <button
                onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                className={clsx(
                  'p-sm rounded-md transition-colors',
                  'text-neutral-700 dark:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-700'
                )}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.12-2.12a4 4 0 00-5.656 0l-2.12 2.12a1 1 0 01-1.414-1.414l2.12-2.12a6 6 0 018.485 0l2.12 2.12a1 1 0 01-1.414 1.414zM9 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            )}

            {/* User menu */}
            {(userName || userMenu) && (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    className={clsx(
                      'p-sm rounded-md transition-colors',
                      'text-neutral-700 dark:text-neutral-300',
                      'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                      'flex items-center gap-sm'
                    )}
                    aria-label="User menu"
                  >
                    {userAvatar ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        {userAvatar}
                      </div>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <span className="hidden md:inline text-sm">{userName}</span>
                  </button>
                </Popover.Trigger>

                <Popover.Content
                  className={clsx(
                    'w-56 p-md',
                    'bg-neutral-50 dark:bg-neutral-800',
                    'border border-neutral-200 dark:border-neutral-700',
                    'rounded-md shadow-lg',
                    'z-popover'
                  )}
                >
                  {userMenu && (
                    <div className="space-y-xs">
                      {userMenu.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            item.onClick?.();
                            setOpenPopover(null);
                          }}
                          className="w-full text-left px-md py-sm text-sm rounded-md transition-colors text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          role="menuitem"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </Popover.Content>
              </Popover.Root>
            )}
          </div>
        </div>

        {/* Secondary: Mobile Context Switchers */}
        {showContextSwitcher && (
          <div className="lg:hidden h-4 px-md flex items-center gap-sm overflow-x-auto border-t border-neutral-200 dark:border-neutral-700">
            {currentTenant && tenants && (
              <ContextSelector
                label="Tenant"
                current={currentTenant}
                items={tenants}
                onChange={onTenantChange}
              />
            )}
            {currentGroup && groups && (
              <ContextSelector
                label="Group"
                current={currentGroup}
                items={groups}
                onChange={onGroupChange}
              />
            )}
            {currentEntity && entities && (
              <ContextSelector
                label="Entity"
                current={currentEntity}
                items={entities}
                onChange={onEntityChange}
              />
            )}
            {currentBranch && branches && (
              <ContextSelector
                label="Branch"
                current={currentBranch}
                items={branches}
                onChange={onBranchChange}
              />
            )}
          </div>
        )}
      </header>
    );
  }
);

TopNav.displayName = 'TopNav';

export { TopNav };
