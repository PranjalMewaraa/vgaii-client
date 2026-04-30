import axios from "axios";

const BASE_URL = "https://api.dataforseo.com/v3";

const auth = {
  username: process.env.DATAFORSEO_LOGIN!,
  password: process.env.DATAFORSEO_PASSWORD!,
};

export const createReviewTask = async (placeId: string) => {
  const res = await axios.post(
    `${BASE_URL}/business_data/google/reviews/task_post`,
    [
      {
        place_id: placeId,
        location_code: 2840,
        language_code: "en",
        depth: 20,
      },
    ],
    { auth }
  );

  return res.data.tasks[0].id;
};

export const getReviewTask = async (taskId: string) => {
  const res = await axios.get(
    `${BASE_URL}/business_data/google/reviews/task_get/${taskId}`,
    { auth }
  );

  return res.data.tasks[0].result[0];
};