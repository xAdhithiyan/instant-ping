import { type Context } from 'hono';
import { fetchOptions } from '../../utils/fetchOptions';
import authClient from '../../utils/authClient';
import { redisClient } from '../..//utils/redis';
import { invalidCommand } from '../mail';

export async function getnMail(
  c?: Context,
  num?: number,
  label: string = '',
  filter: string = '',
  token: string = '',
  id: string = ''
) {
  try {
    let mail;
    if (c != undefined) {
      mail = authClient.setAuth(c.get('user').token);
    } else {
      mail = authClient.setAuth(token);
    }
    console.log(filter);
    const mailIds = await mail.users.messages.list({
      userId: 'me',
      maxResults: num,
      labelIds: label ? [label] : [],
      q: filter ? filter : '',
    });

    const allMailDetails = mailIds.data.messages?.map((n) => {
      return mail.users.messages.get({
        userId: 'me',
        id: n.id as string,
      });
    });

    const mailDetials = await Promise.all(allMailDetails || []);

    if (mailDetials.length == 0) {
      throw new Error('No Mail Found ');
    }

    const subject = mailDetials.map((mail, index) => {
      const sub = mail.data.payload?.headers?.find((obj) => obj.name == 'Subject');
      const from = mail.data.payload?.headers?.find((obj) => obj.name == 'From');
      const to = mail.data.payload?.headers?.find((obj) => obj.name == 'To');
      const inReplyTo = mail.data.payload?.headers?.find((obj) => obj.name == 'In-Reply-To');
      const referecnes = mail.data.payload?.headers?.find((obj) => obj.name == 'References');
      const messageID = mail.data.payload?.headers?.find((obj) => obj.name == 'Message-ID');

      return {
        id: mail.data.id,
        threadid: mail.data.threadId,
        index: index + 1,
        from: from?.value,
        sub: sub?.value,
        to: to?.value,
        inReplyTo: inReplyTo?.value,
        referecnes: referecnes?.value,
        messageID: messageID?.value,
      };
    });

    const userId = c?.get('user').id ? c?.get('user').id : id;
    await redisClient.del(`${userId}mail`);
    const stringSubject = (
      await Promise.all(
        subject.map(async (item) => {
          await redisClient.hSet(`${userId}mail`, `${item.index}`, JSON.stringify(item));

          return `Index: ${item.index}\nFrom: ${item.from}\nSub: ${item.sub}`;
        })
      )
    ).join('\n\n');

    if (c != undefined) {
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
    }
  } catch (e) {
    console.log(e);
    if (c != undefined) {
      invalidCommand(c, e as string);
      return c.json('error');
    } else {
      console.log(e);
    }
  }
}
