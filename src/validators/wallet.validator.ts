import { z } from "zod";

export const fundWalletSchema = z.object({
  amount: z.number().min(100),
  reason: z.string().trim(),
});
