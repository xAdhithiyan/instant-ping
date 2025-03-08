import type { Context } from 'hono';
import { google } from 'googleapis';
import authClient from '../utils/authClient';

export async function getnMail(c: Context, totalMails = 1) {
  try {
    authClient.setAuth(c.get('user').token);
    const mail = google.gmail({ version: 'v1', auth: authClient.getAuth() });
    const lastMail = await mail.users.messages.list({
      userId: 'me',
      maxResults: 2,
    });

    const mailDetials = await mail.users.messages.get({
      userId: 'me',
      id: lastMail.data?.messages[0].id as string,
    });

    console.log(mailDetials);
    //const subject = mailDetials.data.payload?.headers;
    //console.log(subject);

    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAP_CLOUD_TOKEN}`,
      },

      body: JSON.stringify({
        messaging_product: 'whatsapp',
        // change mobile number
        to: '919629050439',
        type: 'text',
        text: { body: 'hello how are you' },
      }),
    };

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
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
  console.log(c.get('user'));
  const body = await c.req.json();

  console.log(JSON.stringify(body, null, 2));

  // if (body.entry[0]?.changes[0].value.messages[0]) {
  //   const text = body.entry[0]?.changes[0].value.messages[0].text.body;
  //
  //   if (text.trim().includes('get')) {
  //     console.log(text);
  //
  //     //check auth before redirecting
  //   }
  // }
  c.text('got the detials', 200);
}
