import { randomBytes } from "crypto";

export const generateFeedbackToken = () => randomBytes(24).toString("hex");

export const buildFeedbackUrl = (origin: string, token: string) =>
  `${origin.replace(/\/$/, "")}/feedback/${token}`;
