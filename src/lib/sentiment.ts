export const getSentiment = (rating: number) => {
  if (rating <= 2) return "negative";
  return "positive";
};