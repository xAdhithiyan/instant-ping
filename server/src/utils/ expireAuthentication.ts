import { redisClient } from './redis';

export async function expireAuth(id: string) {
  const user = await redisClient.hGet('allUsers', id);
  const parsedUser = JSON.parse(user!);
  if (parsedUser) {
    const expireDate: Date = new Date(
      new Date(parsedUser.updated_at).getTime() + parsedUser.expired_at * 1000
    );

    const currentDate: Date = new Date();
    if (currentDate < expireDate) {
      return true;
    } else {
      await redisClient.hDel('allUsers', id);
      return false;
    }
  } else {
    return false;
  }
}
