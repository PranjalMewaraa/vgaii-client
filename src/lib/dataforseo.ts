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
