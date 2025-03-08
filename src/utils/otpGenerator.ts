import { type otpType } from '../types/types';

// temperory -> change to redis
const otp = (() => {
  const allOTP: Record<string, otpType> = {};

  const generateOTP = (id: string = '', phoneNumber: string) => {
    const randomOTP = Math.floor(100000 + Math.random() * 900000);
    if (id) {
      allOTP[id] = { randomOTP, phoneNumber };
    }
    return randomOTP;
  };

  const verifyOtp = (id: string = '', randomOTP: number) => {
    if (allOTP[id]?.randomOTP == randomOTP) {
      const user = allOTP[id];
      delete allOTP[id];
      return user;
    } else {
      return null;
    }
  };

  return {
    generateOTP,
    verifyOtp,
  };
})();

export default otp;
