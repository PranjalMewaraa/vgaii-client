import { prisma } from "@/lib/prisma";
import { canonicalPhone } from "@/lib/phone";
import type { Prisma } from "@/generated/prisma/client";

// Repo-layer helpers that own the `phoneNormalized` derivation. The
// Mongoose schema had a `pre("save")` hook that kept this column in sync
// with `phone`; Prisma has no equivalent, so every code path that creates
// a Lead or mutates its `phone` MUST go through these wrappers.
//
// If you find yourself reaching for `prisma.lead.create` or `update` with
// a phone field directly, route through here instead.

type CreateLeadInput = Omit<Prisma.LeadUncheckedCreateInput, "phoneNormalized">;

export const createLead = async (data: CreateLeadInput) => {
  return prisma.lead.create({
    data: {
      ...data,
      phoneNormalized: canonicalPhone(data.phone),
    },
  });
};

type UpdateLeadInput = Prisma.LeadUncheckedUpdateInput;

// Use this when an update touches `phone`. If `data.phone` is undefined,
// the helper is a thin pass-through to `prisma.lead.update`.
export const updateLead = async (
  where: Prisma.LeadWhereUniqueInput,
  data: UpdateLeadInput,
) => {
  const next: UpdateLeadInput = { ...data };
  if (typeof data.phone === "string") {
    next.phoneNormalized = canonicalPhone(data.phone);
  }
  return prisma.lead.update({ where, data: next });
};
