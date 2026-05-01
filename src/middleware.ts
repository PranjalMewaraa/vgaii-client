import { NextResponse, type NextRequest } from "next/server";

const APP_HOSTS = (process.env.APP_HOSTS ?? "localhost,localhost:3000")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// Vercel deployments (production + previews) all live on *.vercel.app. We
// treat them as the main app by default so the panel works out of the box
// after a deploy without requiring APP_HOSTS to be set.
const isVercelAppHost = (host: string) => host.endsWith(".vercel.app");

// VERCEL_URL is auto-populated by Vercel with the current deployment's URL
// (e.g. "client-vgaii-abc.vercel.app"). Treat it as a main host too.
const VERCEL_URL = (process.env.VERCEL_URL ?? "").toLowerCase();

const isMainHost = (host: string) => {
  if (APP_HOSTS.includes(host)) return true;
  if (APP_HOSTS.includes(host.replace(/^www\./, ""))) return true;
  if (isVercelAppHost(host)) return true;
  if (VERCEL_URL && host === VERCEL_URL) return true;
  return false;
};

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase();

  if (!host || isMainHost(host)) {
    return NextResponse.next();
  }

  // Avoid an infinite rewrite loop if the request is already on the
  // internal lookup route or hitting an asset.
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/host/")) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/host/${encodeURIComponent(host)}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals, and any path with a file extension.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
