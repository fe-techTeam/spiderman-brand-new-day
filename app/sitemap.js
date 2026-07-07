const SITE_URL = "https://spidermania.in";

export default function sitemap() {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/forum`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/mj-wall`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/fan-art`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/quiz`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
