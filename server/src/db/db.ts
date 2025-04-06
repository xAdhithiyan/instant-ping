import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = postgres({
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_DB,
  username: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT),
});

export const db = drizzle(connectionString);
const result = await db.execute('select 1');
console.log('connected to database', result);
