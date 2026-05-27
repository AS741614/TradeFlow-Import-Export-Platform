'use client';

import React from 'react';

interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div
      style={{
        padding: 'var(--space-md)',
        margin: 'var(--space-md) 0',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderLeft: '4px solid var(--accent-red)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--accent-red)',
        fontSize: 'var(--font-size-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
