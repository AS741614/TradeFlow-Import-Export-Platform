'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COUNTRIES } from '@/lib/constants';
import { signUpUser } from './actions';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

export default function SignupForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0] ?? 'United States');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSignup = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName || !email || !password || !orgName || !country) {
      setError('All fields are required.');
      return;
    }

    if (password.length < 12) {
      setError('Password must be at least 12 characters long.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await signUpUser({
          displayName,
          email,
          password,
          orgName,
          country,
        });

        if (res.success) {
          // Auto sign in user after successful registration
          const signInRes = await signIn('credentials', {
            email,
            password,
            redirect: false,
          });

          if (signInRes.error) {
            setError('Account created, but failed to log in automatically. Please go to the login page.');
          } else {
            router.push('/');
            router.refresh();
          }
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred during signup.';
        setError(errMsg);
      }
    });
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <h2 className="auth-title">Create Owner Account</h2>
        <p className="auth-subtitle">
          TradeFlow self-registration: Bootstrap your organization.
        </p>

        {error && (
          <div className="auth-error-banner" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="auth-form">
          <FormField id="input-name" label="Full Name">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={isPending}
            />
          </FormField>

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

          <FormField id="input-password" label="Password" hint="Must contain at least 12 characters.">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 12 characters"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField id="input-org-name" label="Organization Name">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="TradeFlow Global"
              required
              disabled={isPending}
            />
          </FormField>

          <FormField id="select-country" label="Base Country">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              disabled={isPending}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>

          <Button
            id="btn-signup-submit"
            type="submit"
            variant="primary"
            disabled={isPending}
            className="auth-submit-btn"
          >
            {isPending ? 'Registering...' : 'Register Owner & Org'}
          </Button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/login" id="link-goto-login" className="auth-footer-link">
            Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
