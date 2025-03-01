import type { Context, Next } from 'hono';
import { db } from '../db/db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

export async function isAuthenticated(c: Context, next: Next) {
  const session = c.get('session');
  if (
    c.req.path.startsWith('/api/auth') ||
    c.req.path.match('/api/mail/webhook')
  ) {
    await next();
  } else {
    console.log('attached user to request');
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, session.get('id')));

    if (currentUser.length > 0) {
      c.set('user', currentUser[0]);
      await next();
    }
  }

  return c.json({ isAuthenticated: false });
}
