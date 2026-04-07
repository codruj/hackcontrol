import { useState } from "react";
import { Button } from "@/ui";
import { Send, Trophy, Clock, CheckCircle } from "@/ui/icons";
import { useRouter } from "next/navigation";

interface Judge {
  user: {
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

interface HackathonInfoProps {
  hackathon: {
    id: string;
    name: string;
    description?: string | null;
    rules?: string | null;
    criteria?: string | null;
    prizes?: string | null;
    matchmaking?: string | null;
    categories?: string | null;
    organizers?: string | null;
    judges_info?: string | null;
    timeline?: unknown;
    url: string;
    is_finished: boolean;
    updatedAt: Date | string;
    Judge?: Judge[];
  };
  userParticipation?: {
    id: string;
    title: string;
    description: string;
    is_reviewed: boolean;
    is_winner: boolean;
  } | null;
}

type TabId = "overview" | "timeline" | "rules" | "prizes" | "people";

interface Tab {
  id: TabId;
  label: string;
}

const HackathonInfo = ({ hackathon, userParticipation }: HackathonInfoProps) => {
  const router = useRouter();

  const timeline = Array.isArray(hackathon.timeline)
    ? (hackathon.timeline as string[]).filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];

  const judges: Judge[] = hackathon.Judge ?? [];

  const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    ...(timeline.length > 0 ? [{ id: "timeline" as TabId, label: "Timeline" }] : []),
    ...(hackathon.rules || hackathon.criteria ? [{ id: "rules" as TabId, label: "Rules" }] : []),
    ...(hackathon.prizes ? [{ id: "prizes" as TabId, label: "Prizes" }] : []),
    ...(hackathon.organizers || hackathon.judges_info || judges.length > 0
      ? [{ id: "people" as TabId, label: "People" }]
      : []),
  ];

  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="container mx-auto mt-8 max-w-4xl px-6 space-y-6">
      {/* Tab navigation */}
      <div className="border-b border-neutral-800">
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
      <div className="min-h-[180px]">
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div>
              {hackathon.description ? (
                <p className="leading-relaxed text-gray-300">{hackathon.description}</p>
              ) : (
                <p className="italic text-gray-500">No description provided.</p>
              )}
            </div>

            {(hackathon.categories || hackathon.matchmaking) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {hackathon.categories && (
                  <div className="rounded-lg border border-neutral-800 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Categories
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-300">
                      {hackathon.categories}
                    </p>
                  </div>
                )}
                {hackathon.matchmaking && (
                  <div className="rounded-lg border border-neutral-800 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Team Formation
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-300">
                      {hackathon.matchmaking}
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
              <div className="h-8 w-px bg-neutral-800" />
              <div>
                <p className="mb-0.5 text-xs text-gray-500">Last Updated</p>
                <p className="text-sm font-medium text-gray-300">
                  {new Date(hackathon.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
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
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Rules
                </h3>
                <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                  {hackathon.rules}
                </p>
              </div>
            )}
            {hackathon.criteria && (
              <div className={hackathon.rules ? "border-t border-neutral-800 pt-6" : ""}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
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
          <div>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
              {hackathon.prizes}
            </p>
          </div>
        )}

        {/* People */}
        {activeTab === "people" && (
          <div className="space-y-6">
            {hackathon.organizers && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Organizers
                </h3>
                <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                  {hackathon.organizers}
                </p>
              </div>
            )}

            {hackathon.judges_info && (
              <div className={hackathon.organizers ? "border-t border-neutral-800 pt-6" : ""}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Judges
                </h3>
                <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                  {hackathon.judges_info}
                </p>
              </div>
            )}

            {judges.length > 0 && (
              <div className={hackathon.organizers || hackathon.judges_info ? "border-t border-neutral-800 pt-6" : ""}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
                  Judge Accounts
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {judges.map((j, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-neutral-800 px-4 py-3"
                    >
                      {j.user.image && (
                        <img
                          src={j.user.image}
                          alt={j.user.name ?? "Judge"}
                          className="h-8 w-8 rounded-full"
                        />
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
      </div>

      {/* Submission status */}
      <div className="rounded-lg border border-neutral-800 p-6">
        {userParticipation ? (
          <div className="rounded-lg border border-green-800/30 bg-green-900/10 p-5">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-green-400">
                  <CheckCircle width={20} />
                  You have submitted a project
                </h3>
                <p className="mb-2 text-white">
                  <span className="text-sm text-gray-400">Project: </span>
                  <span className="font-medium">{userParticipation.title}</span>
                </p>
                {userParticipation.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-gray-400">
                    {userParticipation.description}
                  </p>
                )}
              </div>
              {userParticipation.is_winner && (
                <div className="flex items-center gap-1 rounded-full bg-yellow-600 px-3 py-1">
                  <Trophy width={16} />
                  <span className="text-sm font-bold text-white">WINNER</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Review Status:</span>
              {userParticipation.is_reviewed ? (
                <span className="flex items-center gap-1 text-sm font-medium text-green-400">
                  <CheckCircle width={14} />
                  Reviewed by organizers
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-medium text-yellow-400">
                  <Clock width={14} />
                  Pending review
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            {!hackathon.is_finished ? (
              <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-5">
                <h3 className="mb-3 text-lg font-semibold text-blue-400">
                  Ready to participate?
                </h3>
                <p className="mb-4 text-gray-400">
                  Submit your project to this hackathon and compete with other developers!
                </p>
                <Button
                  onClick={() => router.push(`/send/${hackathon.url}`)}
                  icon={<Send width={18} />}
                >
                  Submit Your Project
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-800/30 bg-gray-900/20 p-5">
                <p className="text-gray-400">
                  This hackathon has ended and is no longer accepting submissions.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* How to Participate */}
      {!hackathon.is_finished && !userParticipation && (
        <div className="rounded-lg border border-neutral-800 p-6">
          <h3 className="mb-4 text-lg font-semibold">How to Participate</h3>
          <ol className="space-y-3 text-gray-400">
            {[
              "Review the hackathon description and requirements carefully",
              "Build your project according to the theme and guidelines",
              'Click the "Submit Your Project" button above',
              "Fill in your project details and submit",
              "Wait for the organizers to review and announce winners",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Results */}
      {hackathon.is_finished && (
        <div className="rounded-lg border border-neutral-800 p-6">
          <h3 className="mb-4 text-lg font-semibold">Hackathon Results</h3>
          {userParticipation?.is_winner ? (
            <div className="rounded-lg bg-yellow-900/20 p-4 text-center">
              <Trophy width={48} className="mx-auto mb-2 text-yellow-500" />
              <p className="text-lg font-bold text-yellow-400">
                Congratulations! You won this hackathon! 🎉
              </p>
            </div>
          ) : (
            <p className="text-gray-400">
              The hackathon has concluded. Check back to see if you&apos;re among the winners!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default HackathonInfo;
