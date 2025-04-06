import { type Context } from 'hono';
import { fetchOptions } from '../../utils/fetchOptions';
import { redisClient } from '../../utils/redis';
import authClient from '../../utils/authClient';

export async function replyMail(c: Context, index: number) {
  try {
    const message = await redisClient.hGet(`${c.get('user').id}mail`, `${index}`);
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

    await redisClient.set(`${c.get('user').id}reply`, JSON.stringify(parsedMessage), {
      EX: 360,
    });

    return true;
  } catch (e) {
    console.log(e);
  }
}
export async function replayMailStage1(c: Context, sub: string) {
  try {
    const message = await redisClient.get(`${c.get('user').id}reply`);
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

    await redisClient.set(`${c.get('user').id}reply`, JSON.stringify(parsedMessage), {
      EX: 360,
    });
  } catch (e) {
    console.log(e);
  }
}

export async function replayMailStage2(c: Context, text: string) {
  try {
    const message = await redisClient.get(`${c.get('user').id}reply`);
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

    await redisClient.set(`${c.get('user').id}reply`, JSON.stringify(parsedMessage), {
      EX: 360,
    });
  } catch (e) {
    console.log(e);
  }
}

export async function replayMailStage3(c: Context, text: string) {
  try {
    const message = await redisClient.get(`${c.get('user').id}reply`);
    const parsedMessage = JSON.parse(message as string);
    await redisClient.del(`${c.get('user').id}reply`);

    if (text.trim() == 'y') {
      const mail = authClient.setAuth(c.get('user').token);
      console.log(parsedMessage);

      if (parsedMessage.messageID) {
        await mail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: Buffer.from(
              'Content-Type: text/plain; charset="UTF-8"\n' +
                'MIME-Version: 1.0\n' +
                'Content-Transfer-Encoding: 7bit\n' +
                `In-Reply-To: ${parsedMessage.messageID}\n` +
                `References: ${parsedMessage.messageID}\n` +
                `Subject: ${parsedMessage.sendSub}\n` +
                `To: ${parsedMessage.from}\n` +
                `From: ${parsedMessage.to}\n\n` +
                parsedMessage.text
            ).toString('base64'),
            threadId: parsedMessage.threadid,
          },
        });
      }

      // else {
      //   await mail.users.messages.send({
      //     userId: 'me',
      //     requestBody: {
      //       raw: Buffer.from(
      //         'Content-Type: text/plain; charset="UTF-8"\n' +
      //           'MIME-Version: 1.0\n' +
      //           'Content-Transfer-Encoding: 7bit\n' +
      //           `In-Reply-To: ${parsedMessage.messageID}\n` +
      //           `References: ${parsedMessage.referecnes}\n` +
      //           `Subject: ${parsedMessage.sendSub}\n` +
      //           `To: ${parsedMessage.from}\n` +
      //           `From: ${parsedMessage.to}` +
      //           parsedMessage.text
      //       ).toString('base64'),
      //       threadId: parsedMessage.threadid,
      //     },
      //   });
      // }

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
