import mongoose from "mongoose";
import Client from "@/models/Client";

/**
 * Resolve a public landing-page identifier (ObjectId or slug) into a Client.
 * Used by the public profile page and the public lead-capture endpoint so
 * either form of URL works the same way.
 */
export const resolveClientByPublicIdentifier = async (identifier: string) => {
  if (!identifier) return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Client.findById(identifier);
    if (byId) return byId;
  }
  return Client.findOne({ profileSlug: identifier.toLowerCase() });
};

export const resolveClientByCustomDomain = async (host: string) => {
  if (!host) return null;
  return Client.findOne({ customDomain: host.toLowerCase() });
};
