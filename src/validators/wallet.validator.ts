import { z } from "zod";

export const fundWalletSchema = z.object({
  amount: z.number().min(100),
  reason: z.string().trim(),
});

export const transferToInternalWalletSchema = z.object({
  amount: z.number().min(100),
  recipient_username: z.string(),
  reason: z.string().trim(),
});

export const transferToExternalWalletSchema = z.object({
  amount: z.number().min(100),
  bank_code: z.string(),
  account_number: z.string(),
  reason: z.string().trim(),
});
