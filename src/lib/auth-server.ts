import { auth } from './auth';

export interface UserSession {
  userId: string;
  orgId: string;
  role: string;
}

interface CustomSession {
  user: {
    id: string;
    orgId: string;
    role?: string;
  };
}

export async function getServerSession(): Promise<UserSession | null> {
  const session = (await auth()) as CustomSession | null;
  if (!session?.user.id || !session.user.orgId) {
    return null;
  }
  return {
    userId: session.user.id,
    orgId: session.user.orgId,
    role: session.user.role ?? 'user',
  };
}

export async function throwIfNotAuthenticated(): Promise<UserSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
