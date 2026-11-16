import { NextResponse } from "next/server";
import {
  resolveClientByPublicIdentifier,
  resolveClientByCustomDomain,
} from "@/lib/public-client";
import { getErrorMessage } from "@/lib/errors";

/**
 * Public read endpoint for the standalone single-file site (hosted-site/).
 *
 *   GET /api/public/profile?id=<cuid|profileSlug>
 *   GET /api/public/profile?identifier=<cuid|profileSlug>   (alias of id)
 *   GET /api/public/profile?host=<customDomain>
 *
 * Returns ONLY public-safe fields ({ id, profile }) and 404s when
 * the profile isn't enabled. The consumer is a browser on a different origin,
 * so this endpoint is intentionally OPEN (the data is already public on the
 * rendered page) and sends permissive CORS headers.
 */

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const identifier = (
      url.searchParams.get("id") ?? url.searchParams.get("identifier")
    )?.trim();
    const host = url.searchParams.get("host")?.trim();

    if (!identifier && !host) {
      return NextResponse.json(
        { error: "Provide an `id`/`identifier` or `host` query parameter." },
        { status: 400, headers: CORS },
      );
    }

    const client = host
      ? await resolveClientByCustomDomain(host)
      : await resolveClientByPublicIdentifier(identifier!);

    const profile = client?.profile as
      | { enabled?: boolean; template?: string }
      | null
      | undefined;
    if (!client || !profile?.enabled) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404, headers: CORS },
      );
    }

    return NextResponse.json(
      {
        id: client.id,
        // Surfaced top-level for convenience; the dashboard saves it inside
        // `profile`. Defaults to "classic" for profiles saved before the
        // template picker existed.
        template: profile.template ?? "classic",
        profile: client.profile,
      },
      { headers: CORS },
    );
  } catch (err: unknown) {
    console.error("[public/profile] failed:", err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500, headers: CORS },
    );
  }
}
