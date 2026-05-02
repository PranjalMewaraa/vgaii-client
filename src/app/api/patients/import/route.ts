import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getUser } from "@/middleware/auth";
import { parseCsv } from "@/lib/csv";
import { canonicalPhone } from "@/lib/phone";
import { generateFeedbackToken } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const REQUIRED = ["name", "phone", "age", "gender"] as const;

type RowResult = { row: number; status: "created" | "updated" | "skipped"; reason?: string };

const cleanString = (v: string | undefined): string | undefined => {
  if (v === undefined) return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
};

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }
    if (user.role !== "CLIENT_ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let csvText: string;

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Missing 'file' field" },
          { status: 400 },
        );
      }
      csvText = await file.text();
    } else {
      csvText = await req.text();
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const { headers, rows } = parseCsv(csvText);
    const missingHeaders = REQUIRED.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required column${missingHeaders.length > 1 ? "s" : ""}: ${missingHeaders.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const results: RowResult[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 for 0-indexed, +1 for header

      const name = cleanString(row.name);
      const phoneRaw = cleanString(row.phone);
      const ageRaw = cleanString(row.age);
      const gender = cleanString(row.gender);

      if (!name || !phoneRaw || !ageRaw || !gender) {
        skipped++;
        results.push({ row: rowNum, status: "skipped", reason: "missing required fields" });
        continue;
      }

      const phone = canonicalPhone(phoneRaw);
      if (phone.length < 10) {
        skipped++;
        results.push({ row: rowNum, status: "skipped", reason: "invalid phone" });
        continue;
      }

      const age = Number(ageRaw);
      if (!Number.isFinite(age) || age < 0 || age > 150) {
        skipped++;
        results.push({ row: rowNum, status: "skipped", reason: "invalid age" });
        continue;
      }

      const email = cleanString(row.email);
      const area = cleanString(row.area);
      const source = cleanString(row.source) ?? "csv-import";
      const notes = cleanString(row.notes);

      try {
        const existing = await Lead.findOne({
          clientId: user.clientId,
          phoneNormalized: phone,
        });

        if (existing) {
          existing.name = name;
          existing.email = email ?? existing.email;
          existing.age = age;
          existing.gender = gender;
          if (area) existing.area = area;
          if (notes) existing.notes = notes;
          if (
            existing.status !== "qualified" &&
            existing.status !== "appointment_booked" &&
            existing.status !== "visited"
          ) {
            existing.status = "qualified";
            existing.statusUpdatedAt = new Date();
          }
          await existing.save();
          updated++;
          results.push({ row: rowNum, status: "updated" });
        } else {
          await Lead.create({
            name,
            phone: phoneRaw,
            email,
            age,
            gender,
            area,
            source,
            notes: notes ?? "",
            status: "qualified",
            statusUpdatedAt: new Date(),
            feedbackToken: generateFeedbackToken(),
            clientId: user.clientId,
            createdBy: user.id,
          });
          created++;
          results.push({ row: rowNum, status: "created" });
        }
      } catch (err: unknown) {
        skipped++;
        results.push({
          row: rowNum,
          status: "skipped",
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      total: rows.length,
      created,
      updated,
      skipped,
      results,
    });
  } catch (err: unknown) {
    console.error("[patients/import] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
