import { type Context } from 'hono';
import { fetchOptions, specialFetchOption } from '../../utils/fetchOptions';
import authClient from '../../utils/authClient';
import { redisClient } from '../../utils/redis';
import s3Commands from '../../utils/s3Commands';
import checkMimeType from '../../utils/mimeType';
import sharp from 'sharp';

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
