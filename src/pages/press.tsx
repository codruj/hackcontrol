import { useState } from "react";
import NextLink from "next/link";
import { api } from "@/trpc/api";
import { ArrowLeft } from "@/ui/icons";
import clsx from "clsx";

export default function PressPage() {
  const [hackathonFilter, setHackathonFilter] = useState<string>("all");

  const { data: articles = [], isLoading } = api.press.getApprovedPublic.useQuery({ limit: 50 });

  const hackathons = Array.from(
    new Map(
      articles
        .filter((a) => a.hackathon)
        .map((a) => [a.hackathon!.url, a.hackathon!]),
    ).values(),
  );

  const filtered =
    hackathonFilter === "all"
      ? articles
      : articles.filter((a) => a.hackathon?.url === hackathonFilter);

  return (
    <div className="min-h-screen px-4 pb-16 pt-16 sm:pt-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <NextLink href="/" className="text-neutral-400 transition-colors hover:text-white">
            <ArrowLeft width={18} />
          </NextLink>
          <h1 className="text-2xl font-medium">Press &amp; Mentions</h1>
        </div>

        {hackathons.length > 1 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setHackathonFilter("all")}
              className={clsx(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                hackathonFilter === "all"
                  ? "border-neutral-500 bg-neutral-800 text-white"
                  : "border-neutral-800 text-neutral-400 hover:text-neutral-300",
              )}
            >
              All hackathons
            </button>
            {hackathons.map((h) => (
              <button
                key={h.url}
                onClick={() => setHackathonFilter(h.url)}
                className={clsx(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  hackathonFilter === h.url
                    ? "border-neutral-500 bg-neutral-800 text-white"
                    : "border-neutral-800 text-neutral-400 hover:text-neutral-300",
                )}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-neutral-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 p-10 text-center">
            <p className="text-neutral-400">No press mentions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-neutral-800 p-5 transition-colors hover:border-neutral-700 hover:bg-neutral-800/30"
              >
                <p className="font-medium text-white leading-snug">{article.title}</p>
                {article.snippet && (
                  <p className="mt-2 text-sm text-neutral-400 line-clamp-2">{article.snippet}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                  {article.source && <span>{article.source}</span>}
                  {article.publishedAt && (
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  )}
                  {article.hackathon && (
                    <span className="text-blue-500/70">{article.hackathon.name}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
