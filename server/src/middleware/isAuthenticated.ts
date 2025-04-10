import type { Context, Next } from 'hono';
import { db } from '../db/db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { redisClient } from '../utils/redis';

export async function isAuthenticated(c: Context, next: Next) {
  const session = c.get('session');

  if (c.req.path.match('/api/auth/google') || c.req.path.match('/api/auth/frontend-status')) {
    await next();
  } else if (c.req.path.match('/api/mail/webhook')) {
    // whatsapp webhoob access

    const data = await c.req.json();
    if (
      Object.prototype.hasOwnProperty.call(data, 'entry') &&
      Object.prototype.hasOwnProperty.call(data.entry[0], 'changes') &&
      Object.prototype.hasOwnProperty.call(data.entry[0].changes[0], 'value')
    ) {
      console.log('whatsapp callback access?');
      const phoneNumer_message_recieved = data.entry[0].changes[0].value?.messages?.[0]?.from;
      const phoneNumber_message_sent = data.entry[0].changes[0].value?.statuses?.[0]?.recipient_id;

      // verifying when message is being recieved to the server
      if (phoneNumer_message_recieved) {
        c.set('recieving_message', true);

        const fetchedUserRedis = await redisClient.HGETALL('allUsers');
        let currentUser = null;
        for (const key in fetchedUserRedis) {
          const parsedFetchedUserRedis = JSON.parse(fetchedUserRedis[key]);
          if (parsedFetchedUserRedis.phonenumber == phoneNumer_message_recieved) {
            currentUser = parsedFetchedUserRedis;
          }
        }
        if (currentUser) {
          const expireDate: Date = new Date(
            new Date(currentUser.updated_at).getTime() + currentUser.expired_at * 1000
          );

          const currentDate: Date = new Date();
          if (currentDate < expireDate) {
            console.log('access granted');
            c.set('user', currentUser);
          } else {
            console.log('access denied');
            await db.update(users).set({ verified: false }).where(eq(users.id, currentUser.id));

            await redisClient.hDel('allUsers', currentUser.id);

            const user = {
              doesntExist: true,
              phonenumber: phoneNumer_message_recieved,
            };
            c.set('user', user);
          }
        } else {
          console.log('access denied');
          const user = {
            doesntExist: true,
            phonenumber: phoneNumer_message_recieved,
          };
          c.set('user', user);
        }

        // verifying before sending a message from server-> cant be done here
      } else if (phoneNumber_message_sent) {
        console.log(phoneNumber_message_sent);
      }

      await next();
    }
  } else {
    // browser verification
    if (session.get('id')) {
      console.log('browser access?');

      let fetchedUserRedis = await redisClient.hGet('allUsers', session.get('id'));
      if (fetchedUserRedis == null) {
        const fetchedUser = await db
          .select()
          .from(users)
          .where(eq(users.id, session.get('id')));
        if (fetchedUser.length > 0) {
          await redisClient.hSet('allUsers', session.get('id'), JSON.stringify(fetchedUser[0]));
          fetchedUserRedis = await redisClient.hGet('allUsers', session.get('id'));
        }
        console.log('db fetch');
      }
      const parsedFetchedUserRedis = JSON.parse(fetchedUserRedis!);
      if (parsedFetchedUserRedis) {
        const expireDate: Date = new Date(
          new Date(parsedFetchedUserRedis.updated_at).getTime() +
            parsedFetchedUserRedis.expired_at * 1000
        );
        const currentDate: Date = new Date();
        console.log(expireDate);
        console.log(currentDate);
        if (currentDate < expireDate) {
          console.log('access granted');
          c.set('user', parsedFetchedUserRedis);
          await next();
        } else {
          console.log('access denied');
          await db
            .update(users)
            .set({ verified: false })
            .where(eq(users.id, session.get('id')));
          await redisClient.hDel('allUsers', session.get('id'));
        }
      }
    }
    return c.json({ isAuthenticated: false }, 401);
  }
  return c.json({ isAuthenticated: false });
}
