// robots.txt — the portal is public; the admin panel and APIs are not for crawlers.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/reset-password"],
    },
    sitemap: "https://spidermania.in/sitemap.xml",
  };
}
