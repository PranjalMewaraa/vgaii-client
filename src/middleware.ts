import { NextResponse, type NextRequest } from "next/server";

const APP_HOSTS = (process.env.APP_HOSTS ?? "localhost,localhost:3000")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const isMainHost = (host: string) =>
  APP_HOSTS.includes(host) ||
  // also strip any leading "www." prefix to match "www.<configured>"
  APP_HOSTS.includes(host.replace(/^www\./, ""));

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
