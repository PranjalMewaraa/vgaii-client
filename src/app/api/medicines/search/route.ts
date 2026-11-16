import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { searchMedicines } from "@/lib/medicines";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Typeahead for the Create Prescription modal. Reads the bundled medicines
// dataset from disk (see src/lib/medicines.ts) — never ships the 32 MB CSV to
// the browser. Node runtime required for fs access.
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "patients");

    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const limitParam = Number(url.searchParams.get("limit"));
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 30)
        : 20;

    const medicines = await searchMedicines(q, limit);
    return NextResponse.json({ medicines });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
