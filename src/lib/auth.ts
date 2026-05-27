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
    strategy: 'jwt',
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
    jwt({ token, user }) {
      // On sign-in, user object is present; persist orgId/role into token
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (user) {
        const customUser = user as unknown as { id: string; orgId: string; role: string };
        token.userId = customUser.id;
        token.orgId = customUser.orgId;
        token.role = customUser.role;
      }
      return token;
    },
    session({ session, token }) {
      // On every getSession() call, read from token (JWT) not from user (DB row)
      const customSessionUser = session.user as unknown as { id: string; orgId: string; role: string };
      customSessionUser.id = (token.userId as string | undefined) ?? '';
      customSessionUser.orgId = (token.orgId as string | undefined) ?? '';
      customSessionUser.role = (token.role as string | undefined) ?? 'user';
      return session;
    },
  },
});

export const { GET, POST } = handlers;
