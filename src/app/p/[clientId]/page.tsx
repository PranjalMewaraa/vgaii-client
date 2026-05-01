import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import ProfileRenderer from "@/components/ProfileRenderer";
import type { Profile } from "@/lib/validators/profile";

type PageProps = { params: Promise<{ clientId: string }> };

export default async function PublicProfilePage({ params }: PageProps) {
  const { clientId } = await params;

  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    notFound();
  }

  await connectDB();
  const client = await Client.findById(clientId)
    .select("profile calendlySchedulingUrl")
    .lean<{
      profile?: Partial<Profile> & { enabled?: boolean };
      calendlySchedulingUrl?: string;
    }>();

  if (!client?.profile?.enabled) {
    notFound();
  }

  return (
    <ProfileRenderer
      profile={client.profile}
      ctaUrl={client.calendlySchedulingUrl}
    />
  );
}

export const dynamic = "force-dynamic";
