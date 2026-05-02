import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import ProfileRenderer from "@/components/ProfileRenderer";
import { resolveClientByCustomDomain } from "@/lib/public-client";
import type { Profile } from "@/lib/validators/profile";

type PageProps = {
  params: Promise<{ host: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ResolvedClient = {
  _id: { toString: () => string };
  profile?: Partial<Profile> & { enabled?: boolean; faviconUrl?: string };
  bookingUrl?: string;
};

const truncate = (s: string, max: number) =>
  s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;

const firstParam = (
  v: string | string[] | undefined,
): string | undefined => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ host: string }>;
}): Promise<Metadata> {
  const { host } = await params;
  await connectDB();
  const client = (await resolveClientByCustomDomain(
    decodeURIComponent(host),
  )) as ResolvedClient | null;
  const p = client?.profile;
  if (!client || !p?.enabled) return { title: "Page not found" };

  const title = [p.doctorName, p.specialty].filter(Boolean).join(" | ") ||
    "Profile";
  const description = truncate(
    p.heroTagline ||
      p.aboutBio ||
      `${p.doctorName ?? ""} ${p.specialty ?? ""}`.trim() ||
      "Professional profile.",
    160,
  );
  const image = p.heroImageUrl || p.aboutImageUrl;

  return {
    title,
    description,
    icons: p.faviconUrl ? { icon: p.faviconUrl } : undefined,
    openGraph: {
      title,
      description,
      type: "profile",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function HostPage({ params, searchParams }: PageProps) {
  const { host } = await params;
  const sp = await searchParams;

  await connectDB();
  const client = (await resolveClientByCustomDomain(
    decodeURIComponent(host),
  )) as ResolvedClient | null;
  if (!client?.profile?.enabled) notFound();

  const utmSource = firstParam(sp.utm_source) ?? firstParam(sp.source);
  const source = utmSource
    ? `website-profile:${utmSource}`
    : "website-profile";

  return (
    <ProfileRenderer
      profile={client.profile}
      ctaUrl={client.bookingUrl}
      clientId={client._id.toString()}
      leadSource={source}
    />
  );
}

export const dynamic = "force-dynamic";
