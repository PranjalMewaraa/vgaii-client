import { z } from "zod";

// Password policy. Kept deliberately modest:
// - 8 chars minimum (NIST 800-63B baseline)
// - Must include at least one letter and one digit
// - No upper-case requirement (research shows it pushes users toward
//   guessable patterns like "Password1!")
// - No max length (let bcrypt handle truncation at 72 bytes)
//
// If you raise the bar later, change it here in one place.

export const PASSWORD_MIN_LENGTH = 8;

export const passwordPolicy = z
  .string()
  .min(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  .refine(s => /[a-zA-Z]/.test(s), {
    message: "Password must contain at least one letter",
  })
  .refine(s => /\d/.test(s), {
    message: "Password must contain at least one digit",
  });

export const passwordPolicyDescription = `At least ${PASSWORD_MIN_LENGTH} characters, with letters and a digit.`;
