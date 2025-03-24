import { type Context } from 'hono';
import { fetchOptions, specialFetchOption } from '../utils/fetchOptions';
import authClient from '../utils/authClient';
import { redisClient } from '../utils/redis';
import s3Commands from '../utils/s3Commands';
import checkMimeType from '../utils/mimeType';
// import checkFileType from '../utils/checkFileType';

export async function getnMail(c: Context, num: number): Promise<Response> {
  try {
    const mail = authClient.setAuth(c.get('user').token);
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
        id: mail.data.id,
        index: index + 1,
        from: from?.value,
        sub: sub?.value,
      };
    });

    await redisClient.del('mail');
    const stringSubject = (
      await Promise.all(
        subject.map(async (item) => {
          await redisClient.hSet('mail', `${item.index}`, JSON.stringify(item));

          return `Index: ${item.index}\nFrom: ${item.from}\nSub: ${item.sub}`;
        })
      )
    ).join('\n\n');

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

export async function getSingleMail(c: Context, index: number) {
  try {
    const mail = authClient.setAuth(c.get('user').token);

    const currentMail = await redisClient.hGet('mail', `${index}`);
    const paresedCurrentMail = JSON.parse(currentMail as string);
    if (currentMail == null) {
      return false;
    }

    const mailDetials = await mail.users.messages.get({
      userId: 'me',
      id: paresedCurrentMail.id,
    });

    // console.log(mailDetials.data.payload?.parts);
    // getting the body of the message
    let body;
    if (mailDetials.data.payload?.parts) {
      for (let i = 0; i < mailDetials.data.payload?.parts?.length; i++) {
        const part = mailDetials.data.payload.parts[i];

        if (part.mimeType == 'multipart/alternative' && part.parts?.length) {
          for (let i = 0; i < part?.parts?.length; i++) {
            const innerPart = part.parts[i];
            if (
              innerPart.mimeType == 'text/plain' ||
              innerPart.mimeType == 'text/html'
            ) {
              if (innerPart.body?.data == '') continue;
              body = Buffer.from(innerPart.body?.data || '', 'base64').toString(
                'utf-8'
              );
              break;
            }
          }
        }
        if (part.mimeType == 'text/plain' || part.mimeType == 'text/html') {
          if (part.body?.data == '') continue;
          body = Buffer.from(part.body?.data || '', 'base64').toString('utf-8');
          break;
        }
      }
    } else {
      body = Buffer.from(
        mailDetials.data.payload?.body?.data || '',
        'base64'
      ).toString('utf-8');
    }
    console.log(body);
    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: `Index: ${paresedCurrentMail.index}\nFrom: ${paresedCurrentMail.from}\nSub: ${paresedCurrentMail.sub}\n\nBody: \n${body}`,
    });

    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );

    // getting attachments
    const attachment = [];
    if (mailDetials.data.payload?.parts) {
      for (let i = 0; i < mailDetials.data.payload?.parts?.length; i++) {
        const part = mailDetials.data.payload.parts[i];
        if (part.filename && part.body?.attachmentId) {
          attachment.push({
            id: part.body?.attachmentId,
            filename: part.filename,
          });
        }
      }
    }

    attachment.map(async (item) => {
      const attachmentData = await mail.users.messages.attachments.get({
        userId: 'me',
        messageId: paresedCurrentMail.id,
        id: item.id,
      });
      console.log(item.filename);

      s3Commands.add(
        item.filename,
        Buffer.from(attachmentData.data.data || '', 'base64')
      );
      const url = await s3Commands.getUrl(item.filename);

      const options = specialFetchOption({
        method: 'POST',
        to: c.get('user').phonenumber,
        type: checkMimeType(item.filename)?.type as string,
        body: item.filename,
        link: url,
      });

      console.log(options);
      await fetch(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        options
      );
    });

    await mail.users.messages.modify({
      userId: 'me',
      id: paresedCurrentMail.id,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
    return true;
  } catch (e) {
    console.log(e);
    return c.json({ e });
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
