import { type Context } from 'hono';
import { fetchOptions, specialFetchOption } from '../utils/fetchOptions';
import authClient from '../utils/authClient';
import { redisClient } from '../utils/redis';
import s3Commands from '../utils/s3Commands';
import checkMimeType from '../utils/mimeType';
import sharp from 'sharp';
import { extractCharacters } from '../utils/extractCharacter';
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
    console.log(mailDetials[0]);

    const subject = mailDetials.map((mail, index) => {
      const sub = mail.data.payload?.headers?.find((obj) => obj.name == 'Subject');
      const from = mail.data.payload?.headers?.find((obj) => obj.name == 'From');
      const to = mail.data.payload?.headers?.find((obj) => obj.name == 'To');
      const inReplyTo = mail.data.payload?.headers?.find((obj) => obj.name == 'In-Reply-To');
      const referecnes = mail.data.payload?.headers?.find((obj) => obj.name == 'References');
      const messageID = mail.data.payload?.headers?.find((obj) => obj.name == 'Message-ID');

      console.log(inReplyTo);
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

    console.log(subject);
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
            if (innerPart.mimeType == 'text/plain' || innerPart.mimeType == 'text/html') {
              if (innerPart.body?.data == '') continue;
              body = Buffer.from(innerPart.body?.data || '', 'base64').toString('utf-8');
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
      body = Buffer.from(mailDetials.data.payload?.body?.data || '', 'base64').toString('utf-8');
    }
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
    if (attachment.length) {
      const options = fetchOptions({
        method: 'POST',
        to: c.get('user').phonenumber,
        type: 'text',
        body: `Attachment Found and Sending...`,
      });

      await fetch(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        options
      );
    }

    const allURL = [];
    for (const item of attachment) {
      const attachmentData = await mail.users.messages.attachments.get({
        userId: 'me',
        messageId: paresedCurrentMail.id,
        id: item.id,
      });

      let bufferData: Buffer = Buffer.from(attachmentData.data.data || '', 'base64');
      if (checkMimeType(item.filename)?.mime == 'image/jpg') {
        console.log('jpg changing');
        bufferData = await sharp(bufferData).png().toBuffer();
        const filenameWithoutExt = item.filename.replace(/\.[^/.]+$/, '');
        item.filename = `${filenameWithoutExt}.png`;
      }

      await s3Commands.add(item.filename, bufferData);
      const url = await s3Commands.getUrl(item.filename);
      allURL.push({
        url,
        filename: item.filename,
      });
    }

    for (const url of allURL) {
      const options = specialFetchOption({
        method: 'POST',
        to: c.get('user').phonenumber,
        type: checkMimeType(url.filename)?.type as string,
        body: url.filename,
        link: url.url,
      });

      await fetch(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        options
      );
    }

    await mail.users.messages.modify({
      userId: 'me',
      id: paresedCurrentMail.id,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } catch (e) {
    console.log(e);
  }
}

export async function replyMail(c: Context, index: number) {
  try {
    const message = await redisClient.hGet('mail', `${index}`);
    let parsedMessage = JSON.parse(message as string);
    parsedMessage = { ...parsedMessage, stage: 1 };

    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: 'Enter the Subject',
    });
    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );

    await redisClient.set('reply', JSON.stringify(parsedMessage), {
      EX: 360,
    });

    return true;
  } catch (e) {
    console.log(e);
  }
}
export async function replayMailStage1(c: Context, sub: string) {
  try {
    const message = await redisClient.get('reply');
    const parsedMessage = JSON.parse(message as string);
    parsedMessage.stage = 2;
    parsedMessage.sendSub = sub;

    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: `Enter the Body `,
    });

    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );

    await redisClient.set('reply', JSON.stringify(parsedMessage), {
      EX: 360,
    });
  } catch (e) {
    console.log(e);
  }
}

export async function replayMailStage2(c: Context, text: string) {
  try {
    const message = await redisClient.get('reply');
    const parsedMessage = JSON.parse(message as string);
    parsedMessage.stage = 3;
    parsedMessage.text = text;

    const options = fetchOptions({
      method: 'POST',
      to: c.get('user').phonenumber,
      type: 'text',
      body: `${parsedMessage.sendSub}\n\n${text}\n\nTO:\nIndex: ${parsedMessage.index}\nFrom: ${parsedMessage.from}\nSub: ${parsedMessage.sub}\n\n *Confirm [y/n]*`,
    });

    await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );

    await redisClient.set('reply', JSON.stringify(parsedMessage), {
      EX: 360,
    });
  } catch (e) {
    console.log(e);
  }
}

export async function replayMailStage3(c: Context, text: string) {
  try {
    const message = await redisClient.get('reply');
    const parsedMessage = JSON.parse(message as string);
    await redisClient.del('reply');

    if (text.trim() == 'y') {
      const mail = authClient.setAuth(c.get('user').token);
      if (parsedMessage.messageID) {
        await mail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: Buffer.from(
              'Content-Type: text/plain; charset="UTF-8"\n' +
                'MIME-Version: 1.0\n' +
                'Content-Transfer-Encoding: 7bit\n' +
                `In-Reply-To: ${parsedMessage.messageID}\n` +
                `Subject: ${parsedMessage.sendSub}\n` +
                `To: ${parsedMessage.from}\n` +
                `From: ${parsedMessage.to}` +
                parsedMessage.text
            ).toString('base64'),
            threadId: parsedMessage.threadid,
          },
        });
      } else {
        await mail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: Buffer.from(
              'Content-Type: text/plain; charset="UTF-8"\n' +
                'MIME-Version: 1.0\n' +
                'Content-Transfer-Encoding: 7bit\n' +
                `In-Reply-To: ${parsedMessage.messageID}\n` +
                `References: ${parsedMessage.referecnes}\n` +
                `Subject: ${parsedMessage.sendSub}\n` +
                `To: ${parsedMessage.from}\n` +
                `From: ${parsedMessage.to}` +
                parsedMessage.text
            ).toString('base64'),
            threadId: parsedMessage.threadid,
          },
        });
      }

      const options = fetchOptions({
        method: 'POST',
        to: c.get('user').phonenumber,
        type: 'text',
        body: `Message Sent`,
      });

      await fetch(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        options
      );
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

    // here send the bloody message
  } catch (e) {
    console.log(e);
  }
}

export async function forwardMessage(c: Context, key: string, mailAddress: string) {
  try {
    const mail = await redisClient.hGet('mail', key);
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
    await redisClient.set('forward', JSON.stringify(paresedMail));
  } catch (e) {
    console.log(e);
  }
}

export async function forwardMessageStage1(c: Context, text: string) {
  const forwardMailDetial = await redisClient.get('forward');
  const parsedForwardMailDetial = JSON.parse(forwardMailDetial as string);
  await redisClient.del('forward');

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
