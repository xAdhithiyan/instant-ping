import { type Context } from 'hono';

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
    const token = c.get('token');
    const grantedScopes = c.get('granted-scopes');
    const user = c.get('user-google');

    // push to postgress
    const info = {
      token,
      grantedScopes,
      user,
    };

    const session = c.get('session');
    session.set('id', token);
    return c.redirect('/api/auth/status');
  } catch (e) {
    return c.json({ e, message: 'authentication failed' });
  }
}

export function googleLogout(c: Context) {
  return c.text('logout');
}
