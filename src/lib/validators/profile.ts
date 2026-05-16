import { z } from "zod";

const trimmedString = (max = 1000) => z.string().trim().max(max);

// Visual variants for the public landing page. Adding a new option here:
// 1. pick a stable kebab-case key,
// 2. add a renderer in src/components/profile-templates/,
// 3. register it in TEMPLATE_RENDERERS in src/components/ProfileRenderer.tsx,
// 4. add a thumbnail/preview to the picker in src/app/(dashboard)/profile/page.tsx.
export const PROFILE_TEMPLATES = ["classic", "premium", "clinical"] as const;
export type ProfileTemplate = (typeof PROFILE_TEMPLATES)[number];

export const profileSchema = z.object({
  enabled: z.boolean().default(false),
  // "classic" was the original (and only) layout; legacy clients without
  // a template field stay on it by default.
  template: z.enum(PROFILE_TEMPLATES).default("classic"),

  doctorName: trimmedString(120).default(""),
  specialty: trimmedString(80).default(""),
  credentials: trimmedString(120).default(""),

  heroTitleLine1: trimmedString(120).default(""),
  heroTitleLine2: trimmedString(120).default(""),
  heroTagline: trimmedString(500).default(""),
  heroImageUrl: trimmedString(2000).default(""),

  aboutImageUrl: trimmedString(2000).default(""),
  faviconUrl: trimmedString(2000).default(""),
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
