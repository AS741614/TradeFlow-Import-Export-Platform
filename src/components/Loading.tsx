'use client';

import React from 'react';

export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-xl)',
        color: 'var(--text-secondary)',
        fontSize: 'var(--font-size-sm)',
        gap: 'var(--space-sm)',
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          border: '3px solid var(--border-subtle)',
          borderTopColor: 'var(--accent-blue)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <span>Loading...</span>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
