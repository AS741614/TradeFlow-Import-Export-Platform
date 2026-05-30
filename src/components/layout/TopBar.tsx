'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

interface UserInfo {
  name: string;
  email: string;
  initials: string;
  orgName: string;
}

interface TopBarProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
  userInfo: UserInfo | null;
}

export default function TopBar({ onMenuToggle, sidebarCollapsed, userInfo }: TopBarProps) {
  return (
    <header className={`topbar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} id="topbar">
      {/* Mobile Menu Toggle */}
      <button
        className="topbar-menu-toggle btn btn-ghost btn-icon btn-sm"
        id="mobile-menu-toggle"
        onClick={onMenuToggle}
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="topbar-search" id="global-search">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search products, shipments, contacts..."
          id="global-search-input"
        />
      </div>

      <div className="topbar-actions">
        {/* Notification Bell linking to Activity Log */}
        <Link
          href="/activity-log"
          className="btn btn-ghost btn-icon btn-sm"
          id="notifications-btn"
          aria-label="Notifications"
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
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </Link>

        {/* Settings */}
        <button className="btn btn-ghost btn-icon btn-sm" id="settings-btn" aria-label="Settings">
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
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        {/* User Details Menu using native HTML details element */}
        <details className="user-menu-details" id="user-menu-details">
          <summary className="topbar-avatar" id="user-avatar" title="User Menu">
            {userInfo?.initials ?? 'TF'}
          </summary>
          <div className="user-menu-content">
            <div className="user-menu-profile">
              <div className="user-menu-name">{userInfo?.name ?? 'TradeFlow User'}</div>
              <div className="user-menu-email">{userInfo?.email ?? 'user@tradeflow.com'}</div>
              <div className="user-menu-org">{userInfo?.orgName ?? 'My Organization'}</div>
            </div>
            <hr className="user-menu-divider" />
            <button
              id="btn-sign-out"
              className="btn btn-secondary btn-sm user-menu-signout"
              onClick={() => {
                void signOut({ callbackUrl: '/login' });
              }}
            >
              Sign Out
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
