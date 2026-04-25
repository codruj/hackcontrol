import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/api";
import Up from "@/animations/up";
import { ArrowLeft, Trophy } from "@/ui/icons";
import { ButtonStyles } from "@/ui/button";
import clsx from "clsx";

type TabId = "overview" | "timeline" | "rules" | "prizes" | "people" | "sponsors";

type Sponsor = { name: string; logo?: string; website?: string };

interface Tab {
  id: TabId;
  label: string;
}

const getPodiumIcon = (rank: number) => {
  switch (rank) {
    case 1: return "🥇";
    case 2: return "🥈";
    case 3: return "🥉";
    default: return "";
  }
};

export default function PublicHackathonPage() {
  const router = useRouter();
  const { url } = router.query;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { data: session } = useSession();
  const backHref = session ? "/app" : "/";
  const backLabel = session ? "Back to Dashboard" : "Back";

  const { data, isLoading, error } = api.hackathon.getHackathonWithWinners.useQuery(
    { url: url as string },
    { enabled: !!url }
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-400">Loading hackathon...</p>
      </div>
    );
  }

  if (error || !data?.hackathon) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <p className="text-gray-400">Hackathon not found</p>
        <Link href={backHref} className={clsx(ButtonStyles)}>
          <div className="flex items-center space-x-2">
            <ArrowLeft width={16} />
            <span>{backLabel}</span>
          </div>
        </Link>
      </div>
    );
  }

  const { hackathon, winners, categoryWinners } = data;

  const timeline = Array.isArray((hackathon as any).timeline)
    ? ((hackathon as any).timeline as string[]).filter((s: string) => s.trim().length > 0)
    : [];

  const judges: { user: { name: string | null; username: string | null; image: string | null } }[] =
    (hackathon as any).Judge ?? [];

  const sponsors: Sponsor[] = Array.isArray((hackathon as any).sponsors)
    ? ((hackathon as any).sponsors as Sponsor[]).filter((s) => s.name?.trim().length > 0)
    : [];

  const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    ...(timeline.length > 0 ? [{ id: "timeline" as TabId, label: "Timeline" }] : []),
    ...(hackathon.rules || hackathon.criteria ? [{ id: "rules" as TabId, label: "Rules" }] : []),
    ...((hackathon as any).prizes ? [{ id: "prizes" as TabId, label: "Prizes" }] : []),
    ...((hackathon as any).organizers || (hackathon as any).judges_info || judges.length > 0
      ? [{ id: "people" as TabId, label: "People" }]
      : []),
    ...(sponsors.length > 0 ? [{ id: "sponsors" as TabId, label: "Sponsors" }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col items-center pb-8 pt-24">
      <div className="w-full max-w-4xl px-4">
        <Link href={backHref} className="mb-6 inline-flex items-center space-x-2 text-gray-400 hover:text-white">
          <ArrowLeft width={16} />
          <span>{backLabel}</span>
        </Link>

        <Up>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{hackathon.name}</h1>
              {hackathon.is_finished && (
                <span className="rounded bg-yellow-600 px-3 py-1 text-sm font-medium">
                  Finished
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Last updated: {new Date(hackathon.updatedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Tab navigation */}
          <div className="border-b border-neutral-800 mb-8">
            <nav className="flex gap-0 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-white text-white"
                      : "border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab content */}
          <div className="mb-10 min-h-[160px]">
            {/* Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {hackathon.description ? (
                  <p className="leading-relaxed text-gray-300">{hackathon.description}</p>
                ) : (
                  <p className="italic text-gray-500">No description provided.</p>
                )}

                {((hackathon as any).categories || (hackathon as any).matchmaking) && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {(hackathon as any).categories && (
                      <div className="rounded-lg border border-neutral-800 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Categories
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-gray-300">
                          {(hackathon as any).categories}
                        </p>
                      </div>
                    )}
                    {(hackathon as any).matchmaking && (
                      <div className="rounded-lg border border-neutral-800 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Team Formation
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-gray-300">
                          {(hackathon as any).matchmaking}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-6 rounded-lg border border-neutral-800 px-5 py-4">
                  <div>
                    <p className="mb-0.5 text-xs text-gray-500">Status</p>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {hackathon.is_finished ? (
                        <>
                          <span className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span className="text-yellow-400">Finished</span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                          <span className="text-green-400">Active</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {activeTab === "timeline" && (
              <div className="space-y-2">
                {timeline.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      {i < timeline.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-neutral-800" />
                      )}
                    </div>
                    <p className="pb-4 pt-1 text-gray-300">{step}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Rules */}
            {activeTab === "rules" && (
              <div className="space-y-6">
                {hackathon.rules && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Rules
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                      {hackathon.rules}
                    </p>
                  </div>
                )}
                {hackathon.criteria && (
                  <div className={hackathon.rules ? "border-t border-neutral-800 pt-6" : ""}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Judging Criteria
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                      {hackathon.criteria}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Prizes */}
            {activeTab === "prizes" && (
              <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                {(hackathon as any).prizes}
              </p>
            )}

            {/* People */}
            {activeTab === "people" && (
              <div className="space-y-6">
                {(hackathon as any).organizers && (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Organizers
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                      {(hackathon as any).organizers}
                    </p>
                  </div>
                )}
                {(hackathon as any).judges_info && (
                  <div className={(hackathon as any).organizers ? "border-t border-neutral-800 pt-6" : ""}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Judges
                    </h3>
                    <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                      {(hackathon as any).judges_info}
                    </p>
                  </div>
                )}
                {judges.length > 0 && (
                  <div className={(hackathon as any).organizers || (hackathon as any).judges_info ? "border-t border-neutral-800 pt-6" : ""}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Judge Accounts
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {judges.map((j, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg border border-neutral-800 px-4 py-3">
                          {j.user.image && (
                            <img src={j.user.image} alt={j.user.name ?? "Judge"} className="h-8 w-8 rounded-full" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">
                              {j.user.name ?? j.user.username ?? "Unknown"}
                            </p>
                            {j.user.username && (
                              <p className="text-xs text-gray-500">@{j.user.username}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Sponsors */}
            {activeTab === "sponsors" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {sponsors.map((sponsor, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-3 rounded-lg border border-neutral-800 p-4 text-center"
                    >
                      {sponsor.logo && (
                        <img
                          src={sponsor.logo}
                          alt={sponsor.name}
                          className="h-12 w-auto max-w-[120px] object-contain"
                        />
                      )}
                      <p className="text-sm font-medium text-white">{sponsor.name}</p>
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Visit website →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Winners section */}
          <div>
            <div className="mb-4 flex items-center space-x-2">
              <Trophy width={24} className="text-yellow-500" />
              <h2 className="text-xl font-medium text-neutral-200">Top Winners</h2>
            </div>

            {!hackathon.is_finished ? (
              <div className="rounded-md border border-blue-600 border-opacity-30 bg-blue-600 bg-opacity-10 p-6 text-center">
                <p className="text-lg text-blue-300">The hackathon is still ongoing!</p>
                <p className="mt-2 text-gray-400">
                  Stay tuned for the winners once the hackathon concludes.
                </p>
              </div>
            ) : categoryWinners && categoryWinners.length > 0 ? (
              <div className="space-y-8">
                {categoryWinners.map((cat) => (
                  <div key={cat.categoryId}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                      {cat.categoryName}
                    </h3>
                    {cat.winners.length > 0 ? (
                      <div className="space-y-3">
                        {cat.winners.map((winner) => (
                          <div
                            key={winner.id}
                            className={clsx(
                              "rounded-md p-4 transition-all",
                              winner.rank === 1
                                ? "border border-yellow-600 border-opacity-30 bg-yellow-600 bg-opacity-20"
                                : winner.rank === 2
                                ? "border border-gray-400 border-opacity-30 bg-gray-400 bg-opacity-20"
                                : "border border-orange-700 border-opacity-30 bg-orange-700 bg-opacity-20"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getPodiumIcon(winner.rank)}</span>
                              <div>
                                <h4 className="text-lg font-medium">{winner.title}</h4>
                                <p className="text-sm text-gray-400">by {winner.creatorName}</p>
                              </div>
                            </div>
                            {winner.description && (
                              <p className="mt-3 text-sm text-gray-300">{winner.description}</p>
                            )}
                            {winner.project_url && (
                              <a
                                href={winner.project_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
                              >
                                View Project →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-md bg-white bg-opacity-5 p-4 text-center">
                        <p className="text-sm text-gray-400">No eligible submissions in this category.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : winners.length > 0 ? (
              <div className="space-y-4">
                {winners.map((winner) => (
                  <div
                    key={winner.id}
                    className={clsx(
                      "rounded-md p-4 transition-all",
                      winner.rank === 1
                        ? "border border-yellow-600 border-opacity-30 bg-yellow-600 bg-opacity-20"
                        : winner.rank === 2
                        ? "border border-gray-400 border-opacity-30 bg-gray-400 bg-opacity-20"
                        : "border border-orange-700 border-opacity-30 bg-orange-700 bg-opacity-20"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getPodiumIcon(winner.rank)}</span>
                      <div>
                        <h3 className="text-lg font-medium">{winner.title}</h3>
                        <p className="text-sm text-gray-400">by {winner.creatorName}</p>
                      </div>
                    </div>
                    {winner.description && (
                      <p className="mt-3 text-sm text-gray-300">{winner.description}</p>
                    )}
                    {winner.project_url && (
                      <a
                        href={winner.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
                      >
                        View Project →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-white bg-opacity-5 p-6 text-center">
                <p className="text-gray-400">No eligible submissions for this hackathon.</p>
              </div>
            )}
          </div>
        </Up>
      </div>
    </div>
  );
}
