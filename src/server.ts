import { Hono, type Context } from 'hono';
import { logger } from 'hono/logger';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { CookieStore, sessionMiddleware, Session } from 'hono-sessions';
import { type SessionDataTypes } from './types/types.ts';
import { isAuthenticated } from './middleware/isAuthenticated.ts';
import authRouter from './routes/auth.ts';
import mailRouter from './routes/mail.ts';
import dotenv from 'dotenv';
import path from 'path';
import s3Commands from './utils/s3Commands.ts';
import './db/db.ts';
import './utils/redis.ts';
import './utils/authClient.ts';

dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const app = new Hono<{
  Variables: {
    session: Session<SessionDataTypes>;
    session_key_rotation: boolean;
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
  })
);
app.use('*', isAuthenticated);

s3Commands.checkConnection();

app.route('/api/auth', authRouter);
app.route('/api/mail', mailRouter);

app.get('/api', (c: Context) => {
  try {
    // const session = c.get('session');
    // const cok = getCookie(c, 'session');
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
