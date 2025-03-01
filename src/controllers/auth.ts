import { type Context } from 'hono';
import { db } from '../db/db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

export function status(c: Context): Response {
  try {
    const session = c.get('session');
    const id = session.get('id');
    if (!id) {
      throw new Error('not authenticated');
    }
    return c.json({ message: 'authenticated' });
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      return c.json({ Err: e.message });
    }
    return c.json({ Err: 'error' });
  }
}

export async function googleLogin(c: Context): Promise<Response> {
  try {
    const token = c.get('token')!;
    //const grantedScopes = c.get('granted-scopes')!;
    const googleUser = c.get('user-google')!;

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, googleUser.id));

    if (currentUser.length > 0) {
      const updatedUser = await db
        .update(users)
        .set({ token: token.token })
        .where(eq(users.id, googleUser.id))
        .returning();

      console.log('user exists', updatedUser);
    } else {
      const newUser = await db
        .insert(users)
        .values({
          id: googleUser.id,
          token: token.token,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
        })
        .returning();
      console.log('new user created', newUser);
    }

    // hash the id
    const session = c.get('session');
    session.set('id', googleUser.id);
    return c.redirect('/api/auth/status');
  } catch (e) {
    console.log(e);
    return c.json({ e });
  }
}

export function googleLogout(c: Context) {
  return c.text('logout');
}
