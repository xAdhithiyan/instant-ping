import type { Context, Next } from 'hono';
import { db } from '../db/db';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

export async function isAuthenticated(c: Context, next: Next) {
  const session = c.get('session');

  if (c.req.path.match('/api/auth/google')) {
    await next();
  } else if (c.req.path.match('/api/mail/webhook')) {
    console.log('sbdfjosbndafljansdfljansbfdljabnfjladbnfaljdfb');
    // whatsapp webhoob access
    const data = await c.req.json();
    if (
      Object.prototype.hasOwnProperty.call(data, 'entry') &&
      Object.prototype.hasOwnProperty.call(data.entry[0], 'changes') &&
      Object.prototype.hasOwnProperty.call(data.entry[0].changes[0], 'value')
    ) {
      console.log('whatsapp callback access?');
      const phoneNumer_message_recieved =
        data.entry[0].changes[0].value?.messages?.[0]?.from;
      const phoneNumber_message_sent =
        data.entry[0].changes[0].value?.statuses?.[0]?.recipient_id;

      // verifying when message is being recieved to the server
      if (phoneNumer_message_recieved) {
        const fetchedUser = await db
          .select()
          .from(users)
          .where(eq(users.phonenumber, phoneNumer_message_recieved));
        if (fetchedUser.length > 0) {
          const expireDate: Date = new Date(
            fetchedUser[0].updated_at.getTime() +
              fetchedUser[0].expired_at * 1000,
          );

          const currentDate: Date = new Date();
          if (currentDate < expireDate) {
            console.log('access granted');
            c.set('user', fetchedUser[0]);
          } else {
            console.log('access denied');
            const newUser = await db
              .update(users)
              .set({ verified: false })
              .where(eq(users.id, session.get('id')));
          }
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
      const fetchedUser = await db
        .select()
        .from(users)
        .where(eq(users.id, session.get('id')));
      if (fetchedUser.length > 0) {
        const expireDate: Date = new Date(
          fetchedUser[0].updated_at.getTime() +
            fetchedUser[0].expired_at * 1000,
        );
        const currentDate: Date = new Date();
        if (currentDate < expireDate) {
          console.log('access granted');
          c.set('user', fetchedUser[0]);
          await next();
        } else {
          console.log('access denied');
          const newUser = await db
            .update(users)
            .set({ verified: false })
            .where(eq(users.id, session.get('id')));
        }
      }
    }
  }
  return c.json({ isAuthenticated: false });
}
