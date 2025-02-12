import type { Context, Next } from 'hono';
import info from '../utils/constants';

export async function isAuthenticated(c: Context, next: Next) {
  const session = c.get('session');
  if (c.req.path.startsWith('/api/auth')) {
    await next();
  } else if (session.get('id')) {
    // postgress implementation
    console.log(session.get('id'));
    for (let i = 0; i < info.length; i++) {
      if (info[i].token.token == session.get('id')) {
        console.log('set');
        c.set('user', info[i]);
      }
    }

    await next();
  }

  return c.json({ isAuthenticated: false });
}
