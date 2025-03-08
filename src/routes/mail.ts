import { Hono } from 'hono';
import { getnMail, webHookVerify, webHookCallback } from '../controllers/mail';

const app = new Hono();

app.get('/', getnMail);
app.get('/webhook', webHookVerify);
app.post('/webhook', webHookCallback);

export default app;
