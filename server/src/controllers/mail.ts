import { type Context } from 'hono';
import { fetchOptions } from '../utils/fetchOptions';

export async function invalidCommand(c: Context, content: string) {
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
