'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCredentialsLogin = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (res.error) {
          setError('Invalid email or password.');
        } else {
          router.push('/');
          router.refresh();
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };

  const handleGoogleLogin = () => {
    void signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <h2 className="auth-title">Sign In to TradeFlow</h2>
        <p className="auth-subtitle">
          Welcome back! Please enter your details.
        </p>

        {error && (
          <div className="auth-error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialsLogin} className="auth-form">
          <FormField id="input-email" label="Email address">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField id="input-password" label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              disabled={isPending}
            />
          </FormField>

          <Button
            id="btn-login-submit"
            type="submit"
            variant="primary"
            disabled={isPending}
            className="auth-submit-btn"
          >
            {isPending ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">or</span>
          <div className="auth-divider-line" />
        </div>

        <Button
          id="btn-login-google"
          onClick={handleGoogleLogin}
          variant="secondary"
          className="auth-google-btn"
        >
          <svg className="auth-google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </Button>

        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/signup" id="link-goto-signup" className="auth-footer-link">
            Sign Up
          </Link>
        </p>
      </Card>
    </div>
  );
}
