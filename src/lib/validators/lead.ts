import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().min(10),
  area: z.string().optional(),
});