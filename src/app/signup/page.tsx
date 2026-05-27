import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema/core';
import { count } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import SignupForm from './signup-form';

export default async function SignupPage() {
  const db = getDb();
  const [result] = await db.select({ value: count() }).from(users);

  if (result && result.value > 0) {
    redirect('/login');
  }

  return <SignupForm />;
}
