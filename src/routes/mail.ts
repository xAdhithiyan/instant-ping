import { Hono } from 'hono';
import {
  getAllMail,
  webHookVerify,
  webHookCallback,
} from '../controllers/mail';

const app = new Hono();

app.get('/', getAllMail);
app.get('/webhook', webHookVerify);
app.post('/webhook', webHookCallback);

export default app;
