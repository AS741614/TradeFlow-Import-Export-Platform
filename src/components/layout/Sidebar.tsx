'use client';

import React, { useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/constants';

interface SidebarProps {
  collapsed: boolean;
  onCollapseToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// SVG Icons mapped by name
function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    operations: (
      <svg viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    inventory: (
      <svg viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    shipments: (
      <svg viewBox="0 0 24 24">
        <path d="M5 18H3a2 2 0 01-2-2V8a2 2 0 012-2h3.19M15 6h2a2 2 0 012 2v1M5 14h14" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
        <path d="M9 18h6" />
      </svg>
    ),
    invoices: (
      <svg viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    contacts: (
      <svg viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    compliance: (
      <svg viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    plan: (
      <svg viewBox="0 0 24 24">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    projects: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
    finance: (
      <svg viewBox="0 0 24 24">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    margins: (
      <svg viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    currency: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <path d="M15 10H10.5a1.5 1.5 0 000 3h3a1.5 1.5 0 010 3H9" />
      </svg>
    ),
    projections: (
      <svg viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    outreach: (
      <svg viewBox="0 0 24 24">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    templates: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
    campaigns: (
      <svg viewBox="0 0 24 24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    tracking: (
      <svg viewBox="0 0 24 24">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    activity: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  };
  return <span className="sidebar-nav-icon">{icons[name] ?? icons.dashboard}</span>;
}

export default function Sidebar({
  collapsed,
  onCollapseToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    'Operations',
    'Finance',
    'Outreach',
  ]);
  const navRef = useRef<HTMLDivElement>(null);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!navRef.current) return;
    const focusable = Array.from(
      navRef.current.querySelectorAll<HTMLElement>('a, button:not(#sidebar-collapse-toggle)')
    );
    const active = document.activeElement as HTMLElement;
    const index = focusable.indexOf(active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % focusable.length;
      focusable[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + focusable.length) % focusable.length;
      focusable[prevIndex]?.focus();
    }
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      id="sidebar"
    >
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
            <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" fill="none" />
            <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <span className="sidebar-title">TradeFlow</span>
        
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            className="sidebar-close-btn"
            onClick={onMobileClose}
            aria-label="Close sidebar"
            id="sidebar-close-btn"
            style={{ display: 'none' }} // Visible in CSS media queries if styled
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" ref={navRef} onKeyDown={handleKeyDown}>
        {NAV_ITEMS.map((item) => (
          <div key={item.label} className="sidebar-nav-group">
            {item.children ? (
              <>
                <button
                  className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                  onClick={() => toggleGroup(item.label)}
                  id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-expanded={expandedGroups.includes(item.label)}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                  <span className="sidebar-group-chevron" aria-hidden="true">
                    {expandedGroups.includes(item.label) ? ' ▾' : ' ▸'}
                  </span>
                </button>
                {expandedGroups.includes(item.label) && (
                  <div className="sidebar-nav-children animate-slide-down">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`sidebar-nav-item ${
                          isActive(child.href) && pathname === child.href ? 'active' : ''
                        }`}
                        id={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={onMobileClose}
                      >
                        <span>{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                className={`sidebar-nav-item ${isActive(item.href) ? 'active' : ''}`}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={onMobileClose}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <button
        className="sidebar-collapse-btn"
        onClick={onCollapseToggle}
        id="sidebar-collapse-toggle"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
        </svg>
      </button>
    </aside>
  );
}
