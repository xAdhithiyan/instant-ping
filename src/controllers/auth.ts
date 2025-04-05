import { type Context } from 'hono';
import { db } from '../db/db';
import { users } from '../db/schema/users';
import { eq, isNull } from 'drizzle-orm';
import { phoneSchema, otpSchema } from '../utils/zodSchema';
import otp from '../utils/otpGenerator';
import { ZodError } from 'zod';
import { redisClient } from '../utils/redis';

export function status(c: Context): Response {
  try {
    const session = c.get('session');
    const id = session.get('id');
    if (!id) {
      throw new Error('not authenticated');
    }
    return c.json({ message: 'authenticated' });
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      return c.json({ Err: e.message });
    }
    return c.json({ Err: 'error' });
  }
}

export async function googleLogin(c: Context): Promise<Response> {
  try {
    const token = c.get('token')!;
    //const grantedScopes = c.get('granted-scopes')!;
    const googleUser = c.get('user-google')!;
    const currentUser = await db
      .select()
      .from(users)
      .where(googleUser.id ? eq(users.id, googleUser.id) : isNull(users.id));

    if (currentUser.length > 0) {
      const updatedUser = await db
        .update(users)
        .set({
          token: token.token,
          expired_at: token.expires_in,
          updated_at: new Date(),
          verified: true,
        })
        .where(googleUser.id ? eq(users.id, googleUser.id) : isNull(users.id))
        .returning();

      console.log('user exists', updatedUser);
    } else {
      const newUser = await db
        .insert(users)
        .values({
          id: googleUser.id,
          token: token.token,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          expired_at: token.expires_in,
          verified: true,
          updated_at: new Date(),
        })
        .returning();
      console.log('new user created', newUser);
    }

    // hash the id
    const session = c.get('session');
    session.set('id', googleUser.id);
    return c.redirect('/api/auth/status');
  } catch (e) {
    console.log(e);
    return c.json({ e });
  }
}

export async function numberAuth(c: Context) {
  try {
    const body = await c.req.json();
    phoneSchema.parse(body);
    const randomOTP = await otp.generateOTP(c.get('user').id, body.phoneNumber);

    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAP_CLOUD_TOKEN}`,
      },

      body: JSON.stringify({
        messaging_product: 'whatsapp',
        // change mobile number
        to: `91${body.phoneNumber}`,
        type: 'text',
        text: { body: `Ur OTP: ${randomOTP}` },
      }),
    };

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      options
    );
    await response.json();

    return c.text('number authentication');
  } catch (e) {
    console.log(e);
    return c.json({ e }, 400);
  }
}

export async function numberVerify(c: Context) {
  try {
    const body = await c.req.json();
    otpSchema.parse(body);
    const phoneNumber = await otp.verifyOtp(c.get('user').id, body.otp);
    if (phoneNumber) {
      const currentUser = await db
        .update(users)
        .set({ phonenumber: `91${phoneNumber}` }) // change to support all countries
        .where(eq(users.id, c.get('user').id))
        .returning();

      await redisClient.hSet('allUsers', currentUser[0].id, JSON.stringify(currentUser[0]));
      console.log(currentUser[0].phonenumber);

      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.WHATSAP_CLOUD_TOKEN}`,
        },

        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: `${currentUser[0].phonenumber}`,
          type: 'text',
          text: {
            body: 'Account Verified',
          },
        }),
      };
      console.log(options);
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        options
      );
      await response.json();

      return c.text('Number verification');
    } else {
      throw new Error('otp not verified');
    }
  } catch (e) {
    if (e instanceof ZodError) {
      return c.json({ e }, 400);
    }
    return c.json({ e: (e as Error).message }, 400);
  }
}

export function googleLogout(c: Context) {
  return c.text('logout');
}
