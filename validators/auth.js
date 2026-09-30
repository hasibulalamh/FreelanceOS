import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  // 12+ chars: this is the only account on a personal automation platform,
  // so a stronger floor than the usual 8 is justified.
  password: z.string().min(12).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});
