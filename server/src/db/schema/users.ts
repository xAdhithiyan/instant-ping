import { pgTable } from 'drizzle-orm/pg-core';
import * as t from 'drizzle-orm/pg-core';

export const users = pgTable('user', {
  id: t.varchar().primaryKey(),
  token: t.varchar().notNull(),
  email: t.varchar().notNull(),
  name: t.varchar().notNull(),
  picture: t.varchar().notNull(),
  updated_at: t.timestamp().notNull().defaultNow(),
  expired_at: t.integer().notNull().default(0),
  verified: t.boolean().notNull(),
  phonenumber: t.varchar(),
});
