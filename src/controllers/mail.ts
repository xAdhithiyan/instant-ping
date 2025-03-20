import { type Context } from 'hono';
import fetchOptions from '../utils/fetchOptions';
import { google } from 'googleapis';
import authClient from '../utils/authClient';

export async function getnMail(c: Context, num: number): Promise<Response> {
  try {
    authClient.setAuth(c.get('user').token);
    const mail = google.gmail({ version: 'v1', auth: authClient.getAuth() });
    const mailIds = await mail.users.messages.list({
      userId: 'me',
      maxResults: num,
    });

    const allMailDetails = mailIds.data.messages?.map((n) => {
      return mail.users.messages.get({
        userId: 'me',
        id: n.id as string,
      });
    });

    const mailDetials = await Promise.all(allMailDetails || []);

    // this goes inside redis
    const subject = mailDetials.map((mail, index) => {
      const sub = mail.data.payload?.headers?.find(
        (obj) => obj.name == 'Subject'
      );

      const from = mail.data.payload?.headers?.find(
        (obj) => obj.name == 'From'
      );

      return {
        index: index + 1,
        from: from?.value,
        sub: sub?.value,
      };
    });

    const stringSubject = subject
      .map(
        (item) => `Index: ${item.index}\nFrom: ${item.from}\nSub: ${item.sub}`
      )
      .join('\n\n');

    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: stringSubject,
    });
    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );

    return c.text('all mail');
  } catch (e) {
    console.log(e);
    return c.json({ err: (e as Error).message });
  }
}

export async function invalidCommand(c: Context, content: string) {
  console.log(c.get('user'));
  const options = fetchOptions({
    method: 'POST',
    to: c.get('user').phonenumber,
    type: 'text',
    body: content,
  });
  await fetch(
    `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    options
  );
}
