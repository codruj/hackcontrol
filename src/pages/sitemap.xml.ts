import type { GetServerSideProps } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://hackathons.utcluj.ro";

function buildSitemap(urls: { loc: string; priority: string; changefreq: string }[]): string {
  const entries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const hackathons = await prisma.hackathon.findMany({ select: { url: true } });

  const urls = [
    { loc: BASE, priority: "1.0", changefreq: "weekly" },
    { loc: `${BASE}/gallery`, priority: "0.6", changefreq: "weekly" },
    { loc: `${BASE}/press`, priority: "0.6", changefreq: "weekly" },
    ...hackathons.map((h) => ({
      loc: `${BASE}/hackathon/${h.url}`,
      priority: "0.8",
      changefreq: "weekly",
    })),
  ];

  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(buildSitemap(urls));
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
