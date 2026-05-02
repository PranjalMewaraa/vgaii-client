import { z } from "zod";
import { getMaxUploadBytes } from "@/lib/r2";

export const ATTACHMENT_KINDS = [
  "prescription",
  "lab_report",
  "scan",
  "xray",
  "other",
] as const;

export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

// Strip directory traversal and odd characters; keep dots, dashes, underscores.
// Result is always non-empty (at minimum "file"). Stays close to the original
// so download UX feels right.
export const sanitizeFilename = (raw: string): string => {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  const trimmed = cleaned.replace(/^[._]+|[._]+$/g, "");
  return trimmed.length > 0 ? trimmed.slice(0, 200) : "file";
};

// We can't reference `getMaxUploadBytes()` directly inside `z.number().max()`
// because zod resolves the bound at schema-build time and we want to honor
// runtime env changes. Resolve in a `refine()` instead.
export const uploadUrlSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    message: "Unsupported file type",
  }),
  size: z
    .number()
    .int()
    .positive()
    .refine(n => n <= getMaxUploadBytes(), {
      message: "File exceeds maximum upload size",
    }),
  kind: z.enum(ATTACHMENT_KINDS),
});
