import { Hono } from 'hono';
import { googleAuth } from '@hono/oauth-providers/google';
import {
  frontEndStatus,
  googleLogin,
  googleLogout,
  numberAuth,
  numberVerify,
  status,
  frontEndStatus2,
  numberStatus,
} from '../controllers/auth';

const app = new Hono();

app.get('/status', status);
app.get('/frontend-status', frontEndStatus);
app.get('/frontend-2-status', frontEndStatus2);
app.get('/number-status', numberStatus);

app.use(
  '/google',
  googleAuth({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRECT,
    redirect_uri: process.env.GOOGLE_CALLBACK_2,
    scope: [
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
  }),
  googleLogin
);

app.get('/logout', googleLogout);
app.post('/number', numberAuth);
app.post('/number/verify', numberVerify);

export default app;
