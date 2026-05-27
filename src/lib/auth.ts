import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDb } from './db/client';
import { users } from './db/schema/core';
import { accounts, sessions, verificationTokens } from './db/schema/auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: 'database',
  },
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials.email || !credentials.password) return null;
        const db = getDb();
        const userRows = await db.select().from(users).where(eq(users.email, credentials.email as string));
        const user = userRows[0];
        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!isValid) return null;

        const returnedUser = {
          id: user.id,
          email: user.email,
          name: user.name ?? user.displayName,
          orgId: user.orgId,
          role: user.role,
        } as unknown as { id: string; email: string; name: string; image?: string; orgId: string; role: string };

        if (user.image !== null) {
          returnedUser.image = user.image;
        }

        return returnedUser;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    session({ session, user }) {
      session.user.id = user.id;
      // Inject orgId and role from database user record into session
      const customUser = user as unknown as { orgId: string; role: string };
      const customSessionUser = session.user as unknown as { id: string; orgId: string; role: string };
      customSessionUser.orgId = customUser.orgId;
      customSessionUser.role = customUser.role;
      return session;
    },
  },
});

export const { GET, POST } = handlers;
