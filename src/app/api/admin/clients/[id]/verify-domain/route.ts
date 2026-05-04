import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import { promises as dns } from "dns";

// Vercel's anycast A record. CNAME targets resolve to several edge IPs;
// we just need to confirm the resolved IP is one of theirs OR the CNAME
// chain points at vercel-dns.com. Either is sufficient signal.
const VERCEL_A_IP = "76.76.21.21";
const VERCEL_CNAME_SUFFIX = "vercel-dns.com";

const HTTP_TIMEOUT_MS = 5000;

type VerifyResult = {
  domain: string;
  // DNS layer
  dns: {
    resolved: boolean;
    cname?: string[];
    a?: string[];
    pointsToVercel: boolean;
    error?: string;
  };
  // HTTPS reachability
  http: {
    ok: boolean;
    status?: number;
    error?: string;
  };
  verified: boolean;
};

async function resolveCname(host: string): Promise<string[]> {
  try {
    const r = await dns.resolveCname(host);
    return r;
  } catch {
    return [];
  }
}

async function resolveA(host: string): Promise<string[]> {
  try {
    const r = await dns.resolve4(host);
    return r;
  } catch {
    return [];
  }
}

const httpsCheck = async (
  host: string,
): Promise<VerifyResult["http"]> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${host}/`, {
      method: "HEAD",
      signal: ctrl.signal,
      // Follow redirects so a `www → apex` 301 still verifies.
      redirect: "follow",
    });
    return { ok: res.ok || res.status === 308, status: res.status };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Request failed",
    };
  } finally {
    clearTimeout(t);
  }
};

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = getUser(req);
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const client = await prisma.client.findUnique({
      where: { id },
      select: { customDomain: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    if (!client.customDomain) {
      return NextResponse.json(
        { error: "No custom domain set on this client" },
        { status: 400 },
      );
    }

    const host = client.customDomain.toLowerCase();

    // Run CNAME and A lookups in parallel — Google's resolver returns
    // whichever record type is set, so we can't predict in advance.
    const [cname, a] = await Promise.all([resolveCname(host), resolveA(host)]);
    const resolved = cname.length > 0 || a.length > 0;

    const cnamePoints = cname.some(c =>
      c.toLowerCase().endsWith(VERCEL_CNAME_SUFFIX),
    );
    const aPoints = a.includes(VERCEL_A_IP);
    const pointsToVercel = cnamePoints || aPoints;

    // Only attempt the HTTPS request if DNS resolved at all — pointless
    // network roundtrip otherwise.
    const http = resolved
      ? await httpsCheck(host)
      : { ok: false, error: "DNS did not resolve" };

    const result: VerifyResult = {
      domain: host,
      dns: {
        resolved,
        cname: cname.length ? cname : undefined,
        a: a.length ? a : undefined,
        pointsToVercel,
        error: resolved ? undefined : "No CNAME or A record found",
      },
      http,
      // Verified means: DNS resolves to us AND HTTPS replies 2xx. It's
      // possible to be "almost there" (DNS right, cert still issuing) —
      // surfacing the two layers separately tells the admin where the
      // gap is.
      verified: resolved && pointsToVercel && http.ok,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
