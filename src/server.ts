import { Hono, type Context } from 'hono';
import { logger } from 'hono/logger';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { CookieStore, sessionMiddleware, Session } from 'hono-sessions';
import { getCookie } from 'hono/cookie';
import { type SessionDataTypes, type userType } from './types/types.ts';
import { isAuthenticated } from './middleware/isAuthenticated.ts';
import './db/db.ts';
import authRouter from './routes/auth.ts';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const app = new Hono<{
  Variables: {
    session: Session<SessionDataTypes>;
    session_key_rotation: boolean;
    user: userType;
  };
}>({});

app.use(logger());
app.use(trimTrailingSlash());
const store = new CookieStore();
app.use(
  '*',
  sessionMiddleware({
    store,
    encryptionKey: process.env.SESSION_SECRET,
    expireAfterSeconds: 3600,
    cookieOptions: {
      sameSite: 'Lax',
      path: '/',
      httpOnly: true,
    },
  }),
);
app.use('*', isAuthenticated);

app.route('/api/auth', authRouter);

app.get('/api', (c: Context) => {
  try {
    const session = c.get('session');
    const cok = getCookie(c, 'session');
    //console.log('cookie:', cok);
    //console.log(session);
    console.log('user attached to the request', c.get('user'));
    return c.json({ message: 'working' });
  } catch (e: unknown) {
    return c.json({ error: e });
  }
});

export default {
  port: 3000,
  fetch: app.fetch,
};
