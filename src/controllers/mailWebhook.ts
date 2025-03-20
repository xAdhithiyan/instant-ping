import { type Context } from 'hono';
import fetchOptions from '../utils/fetchOptions';
import { getnMail, invalidCommand } from './mail';

export async function webHookVerify(c: Context) {
  console.log('webhook callback function');
  if (
    c.req.query('hub.mode') === 'subscribe' &&
    c.req.query('hub.verify_token') === process.env.WHATSAPP_WEBHOOK_TOKEN
  ) {
    return c.text(c.req.query('hub.challenge') || '', 200);
  } else {
    return c.text('Forbidden', 403);
  }
}

export async function webHookCallback(c: Context) {
  try {
    const body = await c.req.json();
    console.log(JSON.stringify(body, null, 2));

    if (c.get('user')?.doesntExist) {
      const options = fetchOptions({
        method: 'POST',
        to: c.get('user').phonenumber,
        type: 'text',
        body: 'This account is not verfied(Phone Number or Mail). Please visit the site and verify ur account.',
      });

      await fetch(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        options
      );
    } else if (
      c.get('recieving_message') &&
      body.entry[0]?.changes[0]?.value?.messages[0]?.text?.body
    ) {
      const text: string =
        body.entry[0]?.changes[0]?.value?.messages[0]?.text?.body;

      const parts = text.split(/\s+/);
      if (parts[0] == 'get' && !isNaN(parseInt(parts[1], 10))) {
        const number = parseInt(parts[1], 10);
        if (number < 1 || number > 20) {
          throw new Error('Value must be between 1-20');
        }

        getnMail(c, number);
      } else {
        throw new Error(
          'Invalid command. Type "help" to get all valid commands.'
        );
      }
    }
    c.text('got the detials', 200);
  } catch (e) {
    invalidCommand(c, (e as Error).message);
    console.log(e);
  }
}
