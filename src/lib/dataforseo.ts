import axios from "axios";

const BASE_URL = "https://api.dataforseo.com/v3";

// Hard ceiling on any DataForSEO call so a slow upstream can never stall a
// request handler. The dashboard self-heal additionally caps itself at 5s
// (see src/lib/business-info.ts).
const REQUEST_TIMEOUT_MS = 8000;

const auth = {
  username: process.env.DATAFORSEO_LOGIN!,
  password: process.env.DATAFORSEO_PASSWORD!,
};

export const getBusinessInfoLive = async (placeId: string) => {
  const res = await axios.post(
    `${BASE_URL}/business_data/google/my_business_info/live`,
    [
      {
        keyword: `place_id:${placeId}`,
        location_code: 2840,
        language_code: "en",
      },
    ],
    { auth, timeout: REQUEST_TIMEOUT_MS },
  );

  const task = res.data?.tasks?.[0];

  if (!task || (task.status_code && task.status_code >= 40000)) {
    const code = task?.status_code ?? res.data?.status_code;
    const message = task?.status_message ?? res.data?.status_message ?? "DataForSEO error";
    console.error("[dataforseo] my_business_info failed", {
      status_code: code,
      status_message: message,
      task,
    });
    throw new Error(`DataForSEO ${code}: ${message}`);
  }

  return task.result?.[0]?.items?.[0];
};

// DataForSEO reviews response item shape (the bits we use). Keys mirror
// the API's snake_case so we can assert directly off the parsed JSON.
export type DataForSEOReviewItem = {
  type?: string;
  rating?: { value?: number };
  timestamp?: string;
  review_text?: string;
  profile_name?: string;
  profile_image_url?: string;
  profile_url?: string;
  // Optional: response left by the business owner.
  owner_answer?: string;
  // Cal.com-style ID from DataForSEO; not always present.
  review_id?: string;
};

// DataForSEO Google Reviews is async-only — there's no /live/advanced
// endpoint for this resource (despite my_business_info having one). We
// submit a task here, then poll task_get/advanced until it completes.
// Tasks usually finish in 30s–3min depending on listing size.
//
// Important: unlike my_business_info, the Reviews endpoint takes
// `place_id` as its own request field — NOT prefixed inside `keyword`.
// Posting `keyword: "place_id:..."` looks like it works (the task posts
// fine) but DataForSEO can't resolve the listing and returns zero items.
// See https://docs.dataforseo.com/v3/business_data/google/reviews/task_post/
export const submitReviewsTask = async (
  placeId: string,
  depth = 30,
): Promise<string> => {
  const body = [
    {
      place_id: placeId,
      language_code: "en",
      depth,
      sort_by: "newest",
    },
  ];

  const res = await axios.post(
    `${BASE_URL}/business_data/google/reviews/task_post`,
    body,
    { auth, timeout: REQUEST_TIMEOUT_MS },
  );

  const task = res.data?.tasks?.[0];
  if (!task || (task.status_code && task.status_code >= 40000)) {
    const code = task?.status_code ?? res.data?.status_code;
    const message =
      task?.status_message ??
      res.data?.status_message ??
      "DataForSEO reviews task_post failed";
    console.error("[dataforseo] reviews task_post failed", {
      status_code: code,
      status_message: message,
      place_id: placeId,
      response: res.data,
    });
    throw new Error(`DataForSEO ${code}: ${message}`);
  }
  if (typeof task.id !== "string") {
    console.error("[dataforseo] reviews task_post returned no id", {
      place_id: placeId,
      response: res.data,
    });
    throw new Error("DataForSEO task_post returned no task id");
  }
  return task.id;
};

export type ReviewsTaskState =
  | { ready: false }
  | { ready: true; items: DataForSEOReviewItem[] };

// DataForSEO status codes that mean "still working" — the task exists,
// just hasn't finished. Treating these as errors caused refreshes to
// discard in-flight tasks and submit new ones each click, so progress
// never accumulated.
const IN_PROGRESS_STATUS_CODES = new Set([
  40100, // task created
  40601, // task handed
  40602, // task in queue
]);

// Returns the task's results if ready, or `{ ready: false }` if it's
// still in progress. Caller polls on its own cadence.
export const getReviewsTaskResult = async (
  taskId: string,
): Promise<ReviewsTaskState> => {
  const res = await axios.get(
    `${BASE_URL}/business_data/google/reviews/task_get/advanced/${encodeURIComponent(taskId)}`,
    { auth, timeout: REQUEST_TIMEOUT_MS },
  );

  const task = res.data?.tasks?.[0];
  if (!task) return { ready: false };

  if (task.status_code && IN_PROGRESS_STATUS_CODES.has(task.status_code)) {
    return { ready: false };
  }
  if (task.status_code && task.status_code >= 40000) {
    // Real error (auth issue, invalid id, expired task, etc). Surface
    // it so the caller can drop the stale id and start fresh.
    console.error("[dataforseo] reviews task_get error", {
      task_id: taskId,
      status_code: task.status_code,
      status_message: task.status_message,
    });
    throw new Error(
      `DataForSEO ${task.status_code}: ${task.status_message ?? "task_get failed"}`,
    );
  }

  // status_code 20000 = ok. `result === null` means the task is still
  // working even when the API didn't return an in-progress code.
  // `items === []` is a *valid* completed state (business has no reviews
  // yet) — we still return ready: true so the caller stops polling.
  if (task.result == null) return { ready: false };

  const items: DataForSEOReviewItem[] = task.result?.[0]?.items ?? [];
  return { ready: true, items };
};
