'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  let errorMessage = 'An error occurred during authentication.';
  if (error === 'Configuration') {
    errorMessage = 'There is a problem with the server configuration. Please verify that client secrets and secrets are correctly configured.';
  } else if (error === 'AccessDenied') {
    errorMessage = 'You do not have access. Sign in was denied.';
  } else if (error === 'Verification') {
    errorMessage = 'The verification token is invalid, expired, or has already been used.';
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ width: '450px', padding: 'var(--space-xl)', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--accent-red-bg)',
            color: 'var(--accent-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            lineHeight: '48px',
            textAlign: 'center',
            margin: '0 auto'
          }}>
            !
          </div>
        </div>
        <h2 style={{ color: 'var(--accent-red)', marginBottom: 'var(--space-md)' }}>Authentication Error</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-base)' }}>
          {errorMessage}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <a href="/login" id="btn-error-back" className="btn btn-primary" style={{ width: '100%' }}>
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)' }}>Loading error details...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
