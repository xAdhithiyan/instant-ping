import { Hono } from 'hono';
import { googleAuth } from '@hono/oauth-providers/google';
import { googleLogin, googleLogout, status } from '../controllers/auth';

const app = new Hono();

app.get('/status', status);

app.use(
  '/google',
  googleAuth({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRECT,
    redirect_uri: process.env.GOOGLE_CALLBACK,
    scope: ['profile'],
  }),
  googleLogin,
);

app.get('/logout', googleLogout);

export default app;
