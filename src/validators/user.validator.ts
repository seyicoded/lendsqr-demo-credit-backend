import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  password: z.string().min(8).max(255),
  username: z.string().trim().min(3).max(100),
  bvn: z.number().min(3),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export const loginUserSchema = z.object({
  password: z.string().min(8).max(255),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;
