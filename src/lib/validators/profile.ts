import { z } from "zod";

const trimmedString = (max = 1000) => z.string().trim().max(max);

export const profileSchema = z.object({
  enabled: z.boolean().default(false),

  doctorName: trimmedString(120).default(""),
  specialty: trimmedString(80).default(""),
  credentials: trimmedString(120).default(""),

  heroTitleLine1: trimmedString(120).default(""),
  heroTitleLine2: trimmedString(120).default(""),
  heroTagline: trimmedString(500).default(""),
  heroImageUrl: trimmedString(2000).default(""),

  aboutImageUrl: trimmedString(2000).default(""),
  aboutBio: trimmedString(3000).default(""),
  achievements: z.array(trimmedString(200)).max(10).default([]),

  servicesTitle: trimmedString(120).default(""),
  servicesSubtitle: trimmedString(300).default(""),
  services: z
    .array(
      z.object({
        title: trimmedString(120).default(""),
        description: trimmedString(500).default(""),
      }),
    )
    .max(8)
    .default([]),

  address: trimmedString(500).default(""),
  phone: trimmedString(50).default(""),
  hours: trimmedString(120).default(""),
});

export type Profile = z.infer<typeof profileSchema>;
