import type { Context } from 'hono';
import { google } from 'googleapis';
import authClient from '../utils/authClient';

export async function getAllMail(c: Context) {
  try {
    authClient.setAuth(c.get('user').token);
    const mail = google.gmail({ version: 'v1', auth: authClient.getAuth() });
    const lastMail = await mail.users.messages.list({
      userId: 'me',
      maxResults: 1,
    });

    const mailDetials = await mail.users.messages.get({
      userId: 'me',
      id: lastMail.data?.messages[0].id as string,
    });

    console.log(mailDetials);
    const subject = mailDetials.data.payload?.headers;
    console.log(subject);

    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAP_CLOUD_TOKEN}`,
      },

      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '919629050439',
        type: 'text',
        text: { body: 'hello how are you' },
      }),
    };

    const response = await fetch(
      'https://graph.facebook.com/v22.0/602049379649444/messages',
      options,
    );
    const data = await response.json();
    console.log(data);

    return c.text('all mail');
  } catch (e) {
    console.log(e);
    return c.json({ err: e.message });
  }
}

export async function webHookVerify(c: Context) {
  console.log('webhook callback function');
  if (
    c.req.query('hub.mode') === 'subscribe' &&
    c.req.query('hub.verify_token') === process.env.WHATSAPP_WEBHOOK_TOKEN
  ) {
    return c.text(c.req.query('hub.challenge'), 200);
  } else {
    return c.text('Forbidden', 403);
  }
}

export async function webHookCallback(c: Context) {
  let body = await c.req.json();
  body = JSON.stringify(body);
  console.log(body);
  c.text('got the detials', 200);
}
