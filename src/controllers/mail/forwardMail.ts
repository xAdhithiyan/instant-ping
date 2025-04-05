import { type Context } from 'hono';
import { fetchOptions } from '../../utils/fetchOptions';
import authClient from '../../utils/authClient';
import { redisClient } from '../../utils/redis';
import { extractCharacters } from '../../utils/extractCharacter';

export async function forwardMessage(c: Context, key: string, mailAddress: string) {
  try {
    const mail = await redisClient.hGet(`${c.get('user').id}mail`, key);
    const paresedMail = JSON.parse(mail as string);

    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: `Send this mail to *${mailAddress}*\n\nIndex: ${paresedMail.index}\nFrom: ${paresedMail.from}\nSub: ${paresedMail.sub}\n\n *Confirm [y/n]*`,
    });

    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );

    paresedMail.forwardMail = mailAddress;
    await redisClient.set(`${c.get('user').id}forward`, JSON.stringify(paresedMail));
  } catch (e) {
    console.log(e);
  }
}

export async function forwardMessageStage1(c: Context, text: string) {
  const forwardMailDetial = await redisClient.get(`${c.get('user').id}forward`);
  const parsedForwardMailDetial = JSON.parse(forwardMailDetial as string);
  await redisClient.del(`${c.get('user').id}forward`);

  console.log(parsedForwardMailDetial);

  if (text == 'y') {
    const mail = authClient.setAuth(c.get('user').token);
    const forwardMail = await mail.users.messages.get({
      userId: 'me',
      id: parsedForwardMailDetial?.id,
      format: 'raw',
    });

    let decoded = Buffer.from(forwardMail.data.raw || '', 'base64').toString('utf-8');
    decoded = extractCharacters(decoded, 'To', `To: ${parsedForwardMailDetial.forwardMail}`) || '';
    decoded = extractCharacters(decoded, 'From', `From: ${parsedForwardMailDetial.to}`) || '';

    decoded = extractCharacters(decoded, 'Cc', '') || '';
    decoded = extractCharacters(decoded, 'Bcc', '') || '';
    decoded = decoded.replace('\nSubject: ', '\nSubject: Fwd: ');

    const encoded = Buffer.from(decoded).toString('base64');

    await mail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encoded,
      },
    });

    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: `Message Forwarded`,
    });

    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );

    console.log('Message Forwarded');
  } else {
    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: `Message Cancelled`,
    });

    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );
  }
}
