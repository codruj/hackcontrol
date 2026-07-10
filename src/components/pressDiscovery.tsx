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
  hackathons,
  onHackathonChange,
  updatingHackathon,
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
    hackathonId: string | null;
    hackathon: { name: string; url: string } | null;
  };
  onApprove?: () => void;
  onReject?: () => void;
  updating: boolean;
  hackathons?: { id: string; name: string }[];
  onHackathonChange?: (hackathonId: string | null) => void;
  updatingHackathon?: boolean;
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

      {hackathons && hackathons.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs text-neutral-500">Hackathon:</label>
          <select
            value={article.hackathonId ?? ""}
            onChange={(e) => onHackathonChange?.(e.target.value || null)}
            disabled={updatingHackathon}
            className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-xs text-white focus:border-blue-700 focus:outline-none disabled:opacity-50"
          >
            <option value="">None</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
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

const inputClass =
  "w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:border-blue-700 focus:outline-none";

const PressDiscovery = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"pending" | "approved" | "keywords" | "add">("pending");
  const [lastResult, setLastResult] = useState<{
    sourcesChecked: number;
    rawResults: number;
    saved: number;
    sourceErrors: string[];
    apiError: string | null;
  } | null>(null);

  const [newKeyword, setNewKeyword] = useState("");

  const [filterHackathonId, setFilterHackathonId] = useState("");

  const [manualUrl, setManualUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSource, setManualSource] = useState("");
  const [manualSnippet, setManualSnippet] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualHackathonId, setManualHackathonId] = useState("");
  const [manualTags, setManualTags] = useState("");

  const { data: pending = [], refetch: refetchPending, isLoading: loadingPending } =
    api.press.listArticles.useQuery(
      { status: "PENDING", hackathonId: filterHackathonId || undefined },
      { enabled: open },
    );

  const { data: approved = [], refetch: refetchApproved, isLoading: loadingApproved } =
    api.press.listArticles.useQuery(
      { status: "APPROVED", hackathonId: filterHackathonId || undefined },
      { enabled: open && tab === "approved" },
    );

  const { data: keywords = [], refetch: refetchKeywords } =
    api.press.listKeywords.useQuery(undefined, { enabled: open });

  const { data: hackathons = [] } =
    api.press.listHackathonsForPress.useQuery(undefined, { enabled: open });

  const discover = api.press.discoverArticles.useMutation({
    onSuccess: (result) => {
      setLastResult(result);
      void refetchPending();
      if (result.saved > 0) {
        toast.success(`${result.saved} new candidate${result.saved !== 1 ? "s" : ""} discovered`);
      } else {
        toast(`${result.rawResults} raw results checked, no new candidates`);
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

  const updateHackathon = api.press.updateArticleHackathon.useMutation({
    onSuccess: () => {
      void refetchPending();
      void refetchApproved();
    },
    onError: (e) => toast.error(e.message || "Failed to update hackathon"),
  });

  const addKeyword = api.press.addKeyword.useMutation({
    onSuccess: () => {
      setNewKeyword("");
      void refetchKeywords();
      toast.success("Keyword added");
    },
    onError: (e) => toast.error(e.message || "Failed to add keyword"),
  });

  const deleteKeyword = api.press.deleteKeyword.useMutation({
    onSuccess: () => void refetchKeywords(),
    onError: (e) => toast.error(e.message || "Failed to remove keyword"),
  });

  const addManual = api.press.addManualArticle.useMutation({
    onSuccess: () => {
      setManualUrl("");
      setManualTitle("");
      setManualSource("");
      setManualSnippet("");
      setManualDate("");
      setManualHackathonId("");
      setManualTags("");
      void refetchApproved();
      toast.success("Article added and published");
    },
    onError: (e) => toast.error(e.message || "Failed to add article"),
  });

  const handleApprove = (id: string) => updateStatus.mutate({ id, status: "APPROVED" });
  const handleReject = (id: string) => updateStatus.mutate({ id, status: "REJECTED" });

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    addKeyword.mutate({ keyword: trimmed });
  };

  const handleAddManual = () => {
    if (!manualUrl.trim() || !manualTitle.trim()) return;
    const tags = manualTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    addManual.mutate({
      url: manualUrl.trim(),
      title: manualTitle.trim(),
      source: manualSource.trim() || undefined,
      snippet: manualSnippet.trim() || undefined,
      publishedAt: manualDate || undefined,
      hackathonId: manualHackathonId || undefined,
      matchedKeywords: tags.length > 0 ? tags : undefined,
    });
  };

  const tabs = [
    { key: "pending" as const, label: "Candidates", badge: pending.length },
    { key: "approved" as const, label: "Approved" },
    { key: "keywords" as const, label: "Keywords" },
    { key: "add" as const, label: "Add link" },
  ];

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
              <div className="text-xs text-neutral-500 space-y-1">
                <span>
                  Last run: {lastResult.sourcesChecked} sources · {lastResult.rawResults} raw results · {lastResult.saved} new candidates saved
                </span>
                {lastResult.apiError && (
                  <p className="text-red-400">API error: {lastResult.apiError}</p>
                )}
                {lastResult.sourceErrors.length > 0 && (
                  <p className="text-neutral-600">
                    Some sources unreachable: {lastResult.sourceErrors.slice(0, 3).join("; ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {hackathons.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs text-neutral-500">Filter by hackathon:</label>
              <select
                value={filterHackathonId}
                onChange={(e) => setFilterHackathonId(e.target.value)}
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white focus:border-blue-700 focus:outline-none"
              >
                <option value="">All hackathons</option>
                {hackathons.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-1 border-b border-neutral-800 overflow-x-auto">
            {tabs.map(({ key, label, badge }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  "shrink-0 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  tab === key
                    ? "border-white text-white"
                    : "border-transparent text-neutral-500 hover:text-neutral-300",
                )}
              >
                {label}
                {badge !== undefined && badge > 0 && (
                  <span className="ml-2 rounded-full bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            ))}
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
                    hackathons={hackathons}
                    onHackathonChange={(hackathonId) => updateHackathon.mutate({ id: a.id, hackathonId })}
                    updatingHackathon={updateHackathon.isLoading}
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
                    hackathons={hackathons}
                    onHackathonChange={(hackathonId) => updateHackathon.mutate({ id: a.id, hackathonId })}
                    updatingHackathon={updateHackathon.isLoading}
                  />
                ))
              )}
            </div>
          )}

          {tab === "keywords" && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-neutral-500 mb-3">
                  Custom keywords are included in every discovery run alongside the automatically generated ones
                  (UTCN, AIRI, hackathon names, sponsor names, mentor and judge companies).
                  A result matching a custom keyword receives an extra relevance score bonus.
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                    placeholder="e.g. AIRO, HackFest, partner name…"
                    className={inputClass}
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim() || addKeyword.isLoading}
                    className="shrink-0 rounded border border-neutral-600 bg-neutral-800 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                {keywords.length === 0 ? (
                  <p className="text-xs text-neutral-500">No custom keywords added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw) => (
                      <span
                        key={kw.id}
                        className="flex items-center gap-1.5 rounded bg-neutral-800 border border-neutral-700 px-2.5 py-1 text-xs text-neutral-200"
                      >
                        {kw.keyword}
                        <button
                          onClick={() => deleteKeyword.mutate({ id: kw.id })}
                          disabled={deleteKeyword.isLoading}
                          className="text-neutral-500 hover:text-red-400 transition-colors leading-none"
                          title="Remove"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "add" && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500">
                Manually added links are published immediately as approved and appear in the public press section.
                Supported types: press articles, university announcements, LinkedIn posts, social media posts, blog posts, partner or sponsor posts.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">URL *</label>
                  <input
                    type="url"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://…"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Title *</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Article or post title"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Source / platform</label>
                  <input
                    type="text"
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value)}
                    placeholder="e.g. LinkedIn, Facebook, Ziar de Cluj, university page…"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Description / excerpt</label>
                  <textarea
                    value={manualSnippet}
                    onChange={(e) => setManualSnippet(e.target.value)}
                    placeholder="Short description or excerpt"
                    rows={3}
                    className={clsx(inputClass, "resize-none")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Publication date</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Related hackathon</label>
                    <select
                      value={manualHackathonId}
                      onChange={(e) => setManualHackathonId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">None</option>
                      {hackathons.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Tags / keywords{" "}
                    <span className="text-neutral-600">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={manualTags}
                    onChange={(e) => setManualTags(e.target.value)}
                    placeholder="e.g. UTCN, hackathon, AIRI"
                    className={inputClass}
                  />
                </div>

                <button
                  onClick={handleAddManual}
                  disabled={!manualUrl.trim() || !manualTitle.trim() || addManual.isLoading}
                  className="rounded-md border border-green-800 bg-green-900/20 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-900/40 disabled:opacity-50"
                >
                  {addManual.isLoading ? "Adding…" : "Add article"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PressDiscovery;
