import { type Context } from 'hono';
import { fetchOptions } from '../utils/fetchOptions';
import { invalidCommand } from './mail';
import { getnMail } from './mail/getnMail';
import { getSingleMail } from './mail/getSingleMail';
import { replyMail, replayMailStage1, replayMailStage2, replayMailStage3 } from './mail/replyMail';
import { forwardMessage, forwardMessageStage1 } from './mail/forwardMail';
import { redisClient } from '../utils/redis';
import { checkValidLabel } from '../utils/checkValidLabel';

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
    //console.log(body);

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
      //console.log(JSON.stringify(body, null, 2));
      const text: string = body.entry[0]?.changes[0]?.value?.messages[0]?.text?.body;

      const parts = text.split(/\s+/);
      const reply = await redisClient.get(`${c.get('user').id}reply`);
      const forward = await redisClient.get(`${c.get('user').id}forward`);

      if (parts[0] == 'get' && !isNaN(parseInt(parts[1], 10))) {
        const number = parseInt(parts[1], 10);
        if (number < 1 || number > 20) {
          throw new Error('Value must be between 1-20');
        }

        if (parts[2] == undefined) {
          getnMail(c, number);
        } else if (parts[2] == '-f') {
          getnMail(c, number, '', parts.slice(3).join(' '));
        } else if (checkValidLabel(parts[2])) {
          if (parts[3] == '-f') {
            getnMail(c, number, parts[2].toUpperCase(), parts.slice(4).join(' '));
          } else {
            getnMail(c, number, parts[2].toUpperCase());
          }
        } else {
          throw new Error('Invalid Label');
        }

        await redisClient.del(`${c.get('user').id}reply`);
      } else if (parts[0] == 'index' && !isNaN(parseInt(parts[1], 10))) {
        const number = parseInt(parts[1], 10);

        if (number < 1 || number > 20) {
          throw new Error('Invalid Index');
        }
        // not awating async function so whatsapp doesnt resend message on failure -> i have no idea what i am doing
        getSingleMail(c, number);
        await redisClient.del(`${c.get('user').id}reply`);
        await redisClient.del(`${c.get('user').id}forward`);
      } else if (parts[0] == 'reply' && !isNaN(parseInt(parts[1], 10))) {
        const number = parseInt(parts[1], 10);
        const mail = await replyMail(c, number);
        if (!mail) {
          throw new Error('Index not found.');
        }
        await redisClient.del(`${c.get('user').id}forward`);
      } else if (
        parts[0] == 'forward' &&
        !isNaN(parseInt(parts[1], 10)) &&
        parts[2] != undefined &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parts[2].trim())
      ) {
        const allMail = await redisClient.hGetAll(`${c.get('user').id}mail`);
        const total = Object.keys(allMail).length;
        if (total < parseInt(parts[1]) || parseInt(parts[1]) < 0) {
          throw new Error('No Message to forward. Try "get n"');
        }

        forwardMessage(c, Object.keys(allMail)[parseInt(parts[1]) - 1], parts[2]);
        await redisClient.del(`${c.get('user').id}reply`);
      } else if (reply) {
        const paresedReply = JSON.parse(reply);
        if (paresedReply.stage == 1) {
          replayMailStage1(c, text);
        } else if (paresedReply.stage == 2) {
          replayMailStage2(c, text);
        } else {
          replayMailStage3(c, text);
        }
      } else if (forward) {
        forwardMessageStage1(c, text);
      } else {
        throw new Error('Invalid command. Type "help" to get all valid commands.');
      }
    }

    c.text('got the detials', 200);
  } catch (e) {
    invalidCommand(c, (e as Error).message);
    console.log(e);
  }
}
