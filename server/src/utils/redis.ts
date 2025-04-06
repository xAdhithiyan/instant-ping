import { createClient } from 'redis';

export const redisClient = createClient({
  url: 'redis://127.0.0.1:6379',
});

async function connectRedis() {
  redisClient.on('connect', () => {
    console.log('connected to redis');
  });

  redisClient.on('error', (err) => {
    console.log('Error occured', err);
  });

  await redisClient.connect();
}

connectRedis();
