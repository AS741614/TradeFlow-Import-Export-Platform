'use client';

import { useState, useTransition } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '@/lib/constants';
import { signUpUser } from './actions';

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ width: '450px', padding: 'var(--space-xl)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>Create Owner Account</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-lg)' }}>
          TradeFlow self-registration: Bootstrap your organization.
        </p>

        {error && (
          <div style={{ padding: 'var(--space-md)', background: '#fde8e8', borderLeft: '4px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)', fontSize: 'var(--font-size-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <label id="label-name" htmlFor="input-name" style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              id="input-name"
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label id="label-email" htmlFor="input-email" style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
              Email address
            </label>
            <input
              id="input-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label id="label-password" htmlFor="input-password" style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
              Password
            </label>
            <input
              id="input-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 12 characters"
              required
              disabled={isPending}
            />
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
              Must contain at least 12 characters.
            </span>
          </div>

          <div>
            <label id="label-org-name" htmlFor="input-org-name" style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
              Organization Name
            </label>
            <input
              id="input-org-name"
              type="text"
              className="form-input"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="TradeFlow Global"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label id="label-country" htmlFor="select-country" style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
              Base Country
            </label>
            <select
              id="select-country"
              className="form-select"
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
          </div>

          <button id="btn-signup-submit" type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }} disabled={isPending}>
            {isPending ? 'Registering...' : 'Register Owner & Org'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <a href="/login" id="link-goto-login" style={{ color: 'var(--accent-blue)', fontWeight: 'var(--font-weight-medium)' }}>
              Sign In
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
