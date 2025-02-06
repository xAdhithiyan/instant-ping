import type { Context, Next } from 'hono';

export async function isAuthenticated(c: Context, next: Next) {
  const session = c.get('session');
  console.log(c.req.path);
  if (session.get('id') || c.req.path.startsWith('/api/auth')) {
    await next();
  }

  return c.json({ isAuthenticated: false });
}
