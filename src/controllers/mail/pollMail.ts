import { expireAuth } from '../../utils/ expireAuthentication';
import { redisClient } from '../../utils/redis';
import { getnMail } from './getnMail';
import { fetchOptions } from '../../utils/fetchOptions';

export async function pollApi() {
  console.log('polling');
  const allUsers = await redisClient.hGetAll('allUsers');
  // must change to mail for each user
  const allMail = await redisClient.hGetAll('mail');

  for (const key in allUsers) {
    const user = allUsers[key];
    const parsedUser = JSON.parse(user);
    const checkExpire = await expireAuth(parsedUser.id);
    if (checkExpire) {
      await getnMail(undefined, 10, '', '', parsedUser.token);

      const removedIndexAllMail = removeIndex(allMail);
      const newAllMail = await redisClient.hGetAll('mail');
      const removedIndexNewAllMail = removeIndex(newAllMail);

      const oldValues = new Set(Object.values(removedIndexAllMail!));
      const diff = Object.values(removedIndexNewAllMail!).filter((val) => !oldValues.has(val));

      console.log(diff);
      if (diff.length > 0) {
        const newBody = arrangeBody(diff, removedIndexNewAllMail);
        console.log(newBody);
        const options = fetchOptions({
          method: 'POST',
          to: parsedUser.phonenumber,
          type: 'text',
          body: newBody,
        });
        await fetch(
          `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
          options
        );
      }
    }
  }
}

function removeIndex(mail: { [x: string]: string }) {
  for (const key in mail) {
    const currentMail = JSON.parse(mail[key]);
    delete currentMail.index;
    mail[key] = JSON.stringify(currentMail);
  }
  return mail;
}

function arrangeBody(mail: string[], allMail: { [x: string]: string }) {
  let str = `*U have got ${mail.length} new Messages*`;
  console.log(mail);

  for (let i = 0; i < mail.length; i++) {
    const parsedMail = JSON.parse(mail[i]);
    const index = getKeyByValue(allMail, mail[i]);
    str += `\n\nIndex: ${index}\nFrom: ${parsedMail.from}\nSub: ${parsedMail.sub}`;
  }
  return str;
}

// @ts-expect-error: idk
function getKeyByValue(object, value: string) {
  return Object.keys(object).find((key) => object[key] === value);
}

setInterval(pollApi, 15 * 60 * 1000);
