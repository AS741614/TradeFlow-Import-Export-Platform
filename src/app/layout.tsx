import type { Metadata } from 'next';
import './globals.css';
import AppLayoutShell from '@/components/layout/AppLayoutShell';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db/client';
import { orgs } from '@/lib/db/schema/core';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'TradeFlow — Import/Export Business Management',
  description: 'Comprehensive platform for managing import/export operations, business planning, project tracking, financial analysis, and email outreach.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  let orgName = 'My Organization';
  let userInfo: { name: string; email: string; initials: string; orgName: string } | null = null;

  if (session?.user) {
    const name = session.user.name ?? 'User';
    const email = session.user.email ?? '';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';

    const customUser = session.user as { orgId?: string };
    if (customUser.orgId) {
      try {
        const db = getDb();
        const rows = await db
          .select({ name: orgs.name })
          .from(orgs)
          .where(eq(orgs.id, customUser.orgId));
        if (rows[0]) {
          orgName = rows[0].name;
        }
      } catch (e) {
        console.error('Failed to load org name:', e);
      }
    }

    userInfo = {
      name,
      email,
      initials,
      orgName,
    };
  }

  return (
    <html lang="en">
      <body>
        <AppLayoutShell userInfo={userInfo}>{children}</AppLayoutShell>
      </body>
    </html>
  );
}
