import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import axios from "axios";

const BASE_URL = "https://api.dataforseo.com/v3";

// Diagnostic endpoint that bypasses our caching/parsing layer and returns
// DataForSEO's raw responses verbatim. Lets us pinpoint whether the issue
// is on our side (parsing) or theirs (account, place_id, response shape).
//
// Steps:
//   1. POSTs a fresh task_post with the client's place_id.
//   2. Polls task_get a few times (3s × 4 = 12s).
//   3. Returns the full request body + every response shape we saw.
//
// Output is admin-only so we don't leak DataForSEO billing or task ids
// to clients.
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    if (user.role !== "CLIENT_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const overridePlaceId = url.searchParams.get("place_id");

    let placeId = overridePlaceId;
    if (!placeId && user.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: user.clientId },
        select: { googlePlaceId: true },
      });
      placeId = client?.googlePlaceId ?? null;
    }
    if (!placeId) {
      return NextResponse.json(
        { error: "No place_id available — set one on the Client or pass ?place_id=..." },
        { status: 400 },
      );
    }

    const auth = {
      username: process.env.DATAFORSEO_LOGIN!,
      password: process.env.DATAFORSEO_PASSWORD!,
    };

    const requestBody = [
      {
        place_id: placeId,
        language_code: "en",
        depth: 30,
        sort_by: "newest",
      },
    ];

    // Step 1 — task_post
    const postRes = await axios.post(
      `${BASE_URL}/business_data/google/reviews/task_post`,
      requestBody,
      { auth, timeout: 8000, validateStatus: () => true },
    );

    const taskId: string | undefined = postRes.data?.tasks?.[0]?.id;

    // Step 2 — poll task_get a few times
    const polls: Array<{
      attempt: number;
      status_code: unknown;
      status_message: unknown;
      result_count: unknown;
      items_count: number;
      sample_item?: unknown;
    }> = [];
    let finalResult: unknown = null;

    if (taskId) {
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const getRes = await axios.get(
          `${BASE_URL}/business_data/google/reviews/task_get/advanced/${encodeURIComponent(taskId)}`,
          { auth, timeout: 8000, validateStatus: () => true },
        );
        const task = getRes.data?.tasks?.[0];
        const items = task?.result?.[0]?.items ?? [];
        polls.push({
          attempt: i + 1,
          status_code: task?.status_code,
          status_message: task?.status_message,
          result_count: task?.result_count,
          items_count: Array.isArray(items) ? items.length : 0,
          sample_item: Array.isArray(items) ? items[0] : undefined,
        });
        if (task?.result != null) {
          finalResult = task;
          break;
        }
      }
    }

    return NextResponse.json({
      requestBody,
      placeId,
      task_post: {
        http_status: postRes.status,
        outer_status_code: postRes.data?.status_code,
        outer_status_message: postRes.data?.status_message,
        task_id: taskId,
        full_task: postRes.data?.tasks?.[0],
      },
      polls,
      finalTask: finalResult,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 },
    );
  }
}
