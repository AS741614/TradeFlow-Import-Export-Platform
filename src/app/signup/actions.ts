'use server';

import { getDb } from '@/lib/db/client';
import { users, orgs } from '@/lib/db/schema/core';
import { count } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export interface SignupInput {
  email: string;
  password?: string;
  displayName: string;
  orgName: string;
  country: string;
}

export async function signUpUser(input: SignupInput) {
  const { email, password, displayName, orgName, country } = input;

  if (!email || !password || !displayName || !orgName || !country) {
    throw new Error('All fields are required.');
  }

  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters long.');
  }

  const db = getDb();

  // Perform inside a transaction to ensure either both org and user are created or neither
  return await db.transaction(async (tx) => {
    const countResult = await tx.select({ value: count() }).from(users);
    const userCount = countResult[0]?.value ?? 0;
    if (userCount > 0) {
      throw new Error('Signup is disabled because users already exist.');
    }

    // Hash password using bcryptjs with cost factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Create organization
    const orgsResult = await tx.insert(orgs).values({
      name: orgName,
      country: country,
    }).returning();
    
    const org = orgsResult[0];
    if (!org) {
      throw new Error('Failed to create organization.');
    }

    // Create user with 'owner' role and links to the new organization
    const usersResult = await tx.insert(users).values({
      email,
      displayName,
      name: displayName,
      passwordHash,
      orgId: org.id,
      role: 'owner',
    }).returning();
    
    const user = usersResult[0];
    if (!user) {
      throw new Error('Failed to create user.');
    }

    return {
      success: true,
      userId: user.id,
      orgId: org.id,
    };
  });
}
