import { useState } from "react";
import { api } from "@/trpc/api";
import { toast } from "sonner";
import clsx from "clsx";

function ArticleStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "rounded px-2 py-0.5 text-xs font-medium",
        status === "APPROVED" && "bg-green-800/40 text-green-400",
        status === "REJECTED" && "bg-red-900/40 text-red-400",
        status === "PENDING" && "bg-neutral-700/40 text-neutral-400",
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function ArticleCard({
  article,
  onApprove,
  onReject,
  updating,
}: {
  article: {
    id: string;
    title: string;
    url: string;
    source: string | null;
    snippet: string | null;
    publishedAt: Date | null;
    relevanceScore: number;
    matchedKeywords: unknown;
    status: string;
    hackathon: { name: string; url: string } | null;
  };
  onApprove?: () => void;
  onReject?: () => void;
  updating: boolean;
}) {
  const keywords = Array.isArray(article.matchedKeywords)
    ? (article.matchedKeywords as string[])
    : [];

  return (
    <div className="rounded-lg border border-neutral-800 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white hover:text-blue-400 transition-colors line-clamp-2"
          >
            {article.title}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-neutral-500 font-mono">
            {Math.round(article.relevanceScore)}pts
          </span>
          <ArticleStatusBadge status={article.status} />
        </div>
      </div>

      {article.snippet && (
        <p className="text-xs text-neutral-400 line-clamp-2">{article.snippet}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        {article.source && <span>{article.source}</span>}
        {article.publishedAt && (
          <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
        )}
        {article.hackathon && (
          <span className="text-blue-500/70">{article.hackathon.name}</span>
        )}
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keywords.slice(0, 6).map((kw) => (
            <span
              key={kw}
              className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {(onApprove || onReject) && (
        <div className="flex gap-2 pt-1">
          {onApprove && (
            <button
              onClick={onApprove}
              disabled={updating}
              className="rounded border border-green-800 bg-green-900/20 px-3 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-900/40 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              disabled={updating}
              className="rounded border border-red-900 bg-red-900/20 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/40 disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const PressDiscovery = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [lastResult, setLastResult] = useState<{
    queriesRun: number;
    saved: number;
    searchConfigured: boolean;
  } | null>(null);

  const { data: pending = [], refetch: refetchPending, isLoading: loadingPending } =
    api.press.listArticles.useQuery({ status: "PENDING" }, { enabled: open });

  const { data: approved = [], refetch: refetchApproved, isLoading: loadingApproved } =
    api.press.listArticles.useQuery({ status: "APPROVED" }, { enabled: open && tab === "approved" });

  const discover = api.press.discoverArticles.useMutation({
    onSuccess: (result) => {
      setLastResult(result);
      void refetchPending();
      if (result.saved > 0) {
        toast.success(`${result.saved} new candidate${result.saved !== 1 ? "s" : ""} discovered`);
      } else {
        toast("No new candidates found");
      }
    },
    onError: (e) => toast.error(e.message || "Discovery failed"),
  });

  const updateStatus = api.press.updateStatus.useMutation({
    onSuccess: () => {
      void refetchPending();
      void refetchApproved();
    },
    onError: (e) => toast.error(e.message || "Failed to update"),
  });

  const handleApprove = (id: string) => updateStatus.mutate({ id, status: "APPROVED" });
  const handleReject = (id: string) => updateStatus.mutate({ id, status: "REJECTED" });

  return (
    <div className="rounded-lg border border-neutral-800 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Press &amp; Mentions</h3>
          <p className="mt-0.5 text-sm text-neutral-400">
            Discover and manage press articles and online mentions related to UTCN hackathons
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md border border-neutral-700 bg-neutral-800/30 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-neutral-800/60"
        >
          {open ? "Hide" : "Open"}
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => discover.mutate()}
              disabled={discover.isLoading}
              className="rounded-md border border-blue-800 bg-blue-900/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-900/40 disabled:opacity-50 disabled:cursor-wait"
            >
              {discover.isLoading ? "Discovering…" : "Discover press mentions"}
            </button>

            {lastResult && (
              <span className="text-xs text-neutral-500">
                Last run: {lastResult.queriesRun} queries · {lastResult.saved} new candidates
                {!lastResult.searchConfigured && (
                  <span className="ml-2 text-yellow-600">
                    (no search API configured — set NEWS_API_KEY or GOOGLE_CSE_KEY + GOOGLE_CSE_ID)
                  </span>
                )}
              </span>
            )}
          </div>

          {!lastResult && (
            <p className="text-xs text-neutral-500">
              Tip: configure <code className="rounded bg-neutral-800 px-1 text-xs">NEWS_API_KEY</code> or{" "}
              <code className="rounded bg-neutral-800 px-1 text-xs">GOOGLE_CSE_KEY</code> +{" "}
              <code className="rounded bg-neutral-800 px-1 text-xs">GOOGLE_CSE_ID</code> in your .env for live results.
            </p>
          )}

          <div className="flex gap-1 border-b border-neutral-800">
            <button
              onClick={() => setTab("pending")}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "pending"
                  ? "border-white text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300",
              )}
            >
              Candidates
              {pending.length > 0 && (
                <span className="ml-2 rounded-full bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pending.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("approved")}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "approved"
                  ? "border-white text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300",
              )}
            >
              Approved
            </button>
          </div>

          {tab === "pending" && (
            <div className="space-y-3">
              {loadingPending ? (
                <p className="text-sm text-neutral-400">Loading…</p>
              ) : pending.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-700 p-6 text-center">
                  <p className="text-sm text-neutral-400">No candidate articles yet.</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Click "Discover press mentions" to search for relevant articles.
                  </p>
                </div>
              ) : (
                pending.map((a) => (
                  <ArticleCard
                    key={a.id}
                    article={a}
                    onApprove={() => handleApprove(a.id)}
                    onReject={() => handleReject(a.id)}
                    updating={updateStatus.isLoading}
                  />
                ))
              )}
            </div>
          )}

          {tab === "approved" && (
            <div className="space-y-3">
              {loadingApproved ? (
                <p className="text-sm text-neutral-400">Loading…</p>
              ) : approved.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-700 p-6 text-center">
                  <p className="text-sm text-neutral-400">No approved articles yet.</p>
                </div>
              ) : (
                approved.map((a) => (
                  <ArticleCard
                    key={a.id}
                    article={a}
                    updating={false}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PressDiscovery;
