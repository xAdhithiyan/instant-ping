import { Hono } from 'hono';
import { webHookVerify, webHookCallback } from '../controllers/mailWebhook';

const app = new Hono();

app.get('/webhook', webHookVerify);
app.post('/webhook', webHookCallback);

export default app;
