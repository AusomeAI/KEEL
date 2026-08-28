/**
 * Sidebar Component
 *
 * A navigation sidebar with:
 * - Logo/branding area
 * - Navigation menu items
 * - User profile menu
 * - Collapsible sections
 * - Mobile drawer support (hamburger menu)
 * - Responsive layout (sidebar on desktop, drawer on mobile)
 * - Full keyboard navigation
 * - WCAG 2.2 AA compliance
 * - Light/dark theme support
 */

import React, { forwardRef, ReactNode, useState } from 'react';
import clsx from 'clsx';

export interface SidebarItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: ReactNode;
  active?: boolean;
  items?: SidebarItem[]; // Submenu items
  collapsible?: boolean;
}

export interface SidebarProps {
  /** Logo/branding element */
  logo?: ReactNode;
  /** Main navigation items */
  items: SidebarItem[];
  /** User profile menu items */
  userMenu?: SidebarItem[];
  /** User name for profile section */
  userName?: string;
  /** User avatar */
  userAvatar?: ReactNode;
  /** Sidebar open state on mobile */
  isOpen?: boolean;
  /** Mobile menu toggle handler */
  onToggleMobile?: (open: boolean) => void;
  /** Selected item ID */
  selectedItemId?: string;
  /** Item selection handler */
  onSelectItem?: (id: string) => void;
  /** Collapsible state for item */
  collapsedItems?: Set<string>;
  /** Collapse item handler */
  onToggleCollapse?: (id: string) => void;
}

const SidebarItem = ({
  item,
  level = 0,
  selectedItemId,
  onSelectItem,
  collapsedItems,
  onToggleCollapse,
}: {
  item: SidebarItem;
  level?: number;
  selectedItemId?: string;
  onSelectItem?: (id: string) => void;
  collapsedItems?: Set<string>;
  onToggleCollapse?: (id: string) => void;
}) => {
  const isCollapsed = collapsedItems?.has(item.id);
  const hasItems = item.items && item.items.length > 0;

  return (
    <div key={item.id}>
      <button
        onClick={() => {
          if (hasItems && item.collapsible) {
            onToggleCollapse?.(item.id);
          } else {
            onSelectItem?.(item.id);
            item.onClick?.();
          }
        }}
        className={clsx(
          'w-full flex items-center gap-md px-md py-sm text-left',
          'rounded-md transition-colors',
          'text-neutral-700 dark:text-neutral-300',
          'hover:bg-neutral-100 dark:hover:bg-neutral-700',
          selectedItemId === item.id && 'bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300',
          level > 0 && 'pl-2xl text-sm'
        )}
        role="menuitem"
        aria-current={selectedItemId === item.id ? 'page' : undefined}
      >
        {item.icon && (
          <span className="flex-shrink-0 w-5 h-5" aria-hidden="true">
            {item.icon}
          </span>
        )}

        <span className="flex-1 truncate">{item.label}</span>

        {item.badge && (
          <span className="flex-shrink-0 text-xs font-semibold px-xs py-0.5 bg-error-100 dark:bg-error-900 text-error-700 dark:text-error-300 rounded-full">
            {item.badge}
          </span>
        )}

        {hasItems && item.collapsible && (
          <svg
            className={clsx(
              'flex-shrink-0 w-4 h-4 transition-transform',
              isCollapsed && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        )}
      </button>

      {/* Submenu */}
      {hasItems && !isCollapsed && (
        <div className="ml-md border-l border-neutral-200 dark:border-neutral-700">
          {item.items!.map((subItem) => (
            <SidebarItem
              key={subItem.id}
              item={subItem}
              level={level + 1}
              selectedItemId={selectedItemId}
              onSelectItem={onSelectItem}
              collapsedItems={collapsedItems}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      logo,
      items,
      userMenu,
      userName,
      userAvatar,
      isOpen = true,
      onToggleMobile,
      selectedItemId,
      onSelectItem,
      collapsedItems = new Set(),
      onToggleCollapse,
    },
    ref
  ) => {
    const [localCollapsed, setLocalCollapsed] = useState(collapsedItems);

    const handleCollapse = (id: string) => {
      const updated = new Set(localCollapsed);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      setLocalCollapsed(updated);
      onToggleCollapse?.(id);
    };

    return (
      <>
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-1000">
          <button
            onClick={() => onToggleMobile?.(!isOpen)}
            className="p-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-neutral-950 bg-opacity-50 z-999 lg:hidden"
            onClick={() => onToggleMobile?.(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          ref={ref}
          className={clsx(
            'fixed left-0 top-0 bottom-0 w-64',
            'bg-neutral-50 dark:bg-neutral-900',
            'border-r border-neutral-200 dark:border-neutral-700',
            'flex flex-col',
            'z-modal-100',
            'overflow-y-auto',
            'transition-transform duration-300',
            'lg:translate-x-0',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Logo */}
          {logo && (
            <div className="px-lg py-md border-b border-neutral-200 dark:border-neutral-700">
              {logo}
            </div>
          )}

          {/* Navigation items */}
          <nav className="flex-1 px-sm py-md space-y-xs overflow-y-auto">
            {items.map((item) => (
              <SidebarItem
                key={item.id}
                item={item}
                selectedItemId={selectedItemId}
                onSelectItem={onSelectItem}
                collapsedItems={localCollapsed}
                onToggleCollapse={handleCollapse}
              />
            ))}
          </nav>

          {/* User menu */}
          {(userMenu || userName) && (
            <div className="px-md py-md border-t border-neutral-200 dark:border-neutral-700">
              {userName && (
                <div className="flex items-center gap-md mb-md">
                  {userAvatar && (
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {userAvatar}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50 truncate">
                      {userName}
                    </p>
                  </div>
                </div>
              )}

              {userMenu && (
                <div className="space-y-xs">
                  {userMenu.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectItem?.(item.id);
                        item.onClick?.();
                      }}
                      className="w-full flex items-center gap-md px-md py-sm text-left text-sm rounded-md transition-colors text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      role="menuitem"
                    >
                      {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Content margin (desktop only) */}
        <div className="hidden lg:block w-64" />
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { Sidebar, SidebarItem };
