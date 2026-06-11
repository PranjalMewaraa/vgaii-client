import { getUser } from "@/middleware/auth";
import { signPutUrl, publicUrlFor, getMaxUploadBytes } from "@/lib/r2";
import { sanitizeFilename } from "@/lib/validators/attachment";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";

// Profile images are world-readable assets served from the public CDN base,
// so there's no DB row or confirm step — the browser uploads to R2 and the
// returned publicUrl is saved into the profile JSON on Save.

const PROFILE_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
] as const;

const schema = z.object({
  kind: z.enum(["hero", "about", "favicon"]),
  filename: z.string().trim().min(1).max(200),
  mimeType: z.enum(PROFILE_IMAGE_MIME, { message: "Unsupported image type" }),
  size: z
    .number()
    .int()
    .positive()
    .refine(n => n <= getMaxUploadBytes(), {
      message: "File exceeds maximum upload size",
    }),
});

export async function POST(req: Request) {
  try {
    const user = getUser(req);
    if (user.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const safeName = sanitizeFilename(parsed.data.filename);
    const key = `clients/${user.clientId}/profile/${parsed.data.kind}-${randomBytes(8).toString("hex")}-${safeName}`;

    const publicUrl = publicUrlFor(key);
    if (!publicUrl) {
      return NextResponse.json(
        { error: "Public file serving isn't configured (R2_PUBLIC_BASE_URL)." },
        { status: 500 },
      );
    }

    const uploadUrl = await signPutUrl(key, parsed.data.mimeType);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err: unknown) {
    console.error("[client/profile/upload-url] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
