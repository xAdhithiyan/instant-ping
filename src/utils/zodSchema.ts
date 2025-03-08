import { z } from 'zod';

export const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .nonempty('Phone number must not be empty')
    .min(10, 'Phone number too short')
    .max(10, 'Phone number too long')
    .regex(/^\d+$/, 'Phone number must contain only digits'),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .nonempty('OTP cannot be empty')
    .min(6, 'OTP too short')
    .max(6, 'OTP too long')
    .regex(/^\d+$/, 'OTP must contain only digits'),
});
