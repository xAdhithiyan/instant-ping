import { redisClient } from './redis';

const otp = (() => {
  const generateOTP = async (id: string = '', phoneNumber: string) => {
    const randomOTP = Math.floor(100000 + Math.random() * 900000);
    if (id) {
      await redisClient.set(`opt:${id}`, JSON.stringify({ phoneNumber, randomOTP }), {
        EX: 300,
      });
    }
    return randomOTP;
  };

  const verifyOtp = async (id: string = '', randomOTP: number) => {
    const user = await redisClient.get(`opt:${id}`);
    const parsedUsed = JSON.parse(user as string);
    console.log(user);
    if (user == null) {
      return null;
    } else if (parsedUsed.randomOTP == randomOTP) {
      await redisClient.del(`opt:${id}`);
      return parsedUsed.phoneNumber;
    }
  };

  return {
    generateOTP,
    verifyOtp,
  };
})();

export default otp;
