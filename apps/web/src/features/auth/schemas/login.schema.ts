import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Minimum 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/\d/, 'Must contain a number')
  .regex(/[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/]/, 'Must contain special character');

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['admin', 'teacher']).optional(),
});

export const registerSchema = z
  .object({
    schoolName: z.string().min(2, 'School name required'),
    adminName: z.string().min(2, 'Name required'),
    email: z.string().email('Invalid email'),
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: z.string().min(10, 'Phone number must be at least 10 digits'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
