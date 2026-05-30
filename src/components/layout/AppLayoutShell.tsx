'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface UserInfo {
  name: string;
  email: string;
  initials: string;
  orgName: string;
}

interface AppLayoutShellProps {
  children: React.ReactNode;
  userInfo: UserInfo | null;
}

export default function AppLayoutShell({ children, userInfo }: AppLayoutShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth');

  if (isAuthRoute) {
    return (
      <div className="auth-layout" id="auth-layout">
        {children}
      </div>
    );
  }

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} id="app-layout">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          id="sidebar-backdrop"
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <main className="app-main">
        <TopBar
          onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          sidebarCollapsed={sidebarCollapsed}
          userInfo={userInfo}
        />
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
