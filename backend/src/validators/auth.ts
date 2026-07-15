import { z } from 'zod';

// ---------------------------------------------------------------------------
// loginSchema — validates login credentials
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

// ---------------------------------------------------------------------------
// forgotPasswordSchema — validates the email for a password reset request
// ---------------------------------------------------------------------------
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address'),
});

// ---------------------------------------------------------------------------
// resetPasswordSchema — validates the reset token + new password pair
// ---------------------------------------------------------------------------
export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});
