import { Button } from "@/ui";
import { Send, Trophy, Clock, CheckCircle } from "@/ui/icons";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

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

const SectionBlock = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg bg-neutral-900/50 p-4">
    <p className="whitespace-pre-wrap leading-relaxed text-gray-300">{children}</p>
  </div>
);

const HackathonInfo = ({ hackathon, userParticipation }: HackathonInfoProps) => {
  const router = useRouter();

  const timeline = Array.isArray(hackathon.timeline)
    ? (hackathon.timeline as string[]).filter((s) => typeof s === "string" && s.trim().length > 0)
    : [];

  const judges: Judge[] = hackathon.Judge ?? [];

  // Determine which tabs have content
  const hasTimeline = timeline.length > 0;
  const hasRules = !!(hackathon.rules || hackathon.criteria);
  const hasPrizes = !!hackathon.prizes;
  const hasPeople = !!(hackathon.organizers || judges.length > 0);

  const defaultTab = "overview";

  return (
    <div className="container mx-auto mt-8 max-w-4xl px-6 space-y-6">
      {/* Section tabs */}
      <div className="rounded-lg border border-neutral-800 p-6">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-4 w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="text-xs px-3 py-2">Overview</TabsTrigger>
            {hasTimeline && (
              <TabsTrigger value="timeline" className="text-xs px-3 py-2">Timeline</TabsTrigger>
            )}
            {hasRules && (
              <TabsTrigger value="rules" className="text-xs px-3 py-2">Rules</TabsTrigger>
            )}
            {hasPrizes && (
              <TabsTrigger value="prizes" className="text-xs px-3 py-2">Prizes</TabsTrigger>
            )}
            {hasPeople && (
              <TabsTrigger value="people" className="text-xs px-3 py-2">People</TabsTrigger>
            )}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <div>
                <h2 className="mb-3 text-lg font-semibold text-white">About</h2>
                {hackathon.description ? (
                  <p className="leading-relaxed text-gray-400">{hackathon.description}</p>
                ) : (
                  <p className="italic text-gray-500">No description provided.</p>
                )}
              </div>

              {hackathon.categories && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                    Categories
                  </h3>
                  <SectionBlock>{hackathon.categories}</SectionBlock>
                </div>
              )}

              {hackathon.matchmaking && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
                    Team Formation
                  </h3>
                  <SectionBlock>{hackathon.matchmaking}</SectionBlock>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 border-t border-neutral-800 pt-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-gray-500">Status</p>
                  <p className="flex items-center gap-2 font-medium">
                    {hackathon.is_finished ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        <span className="text-yellow-500">Finished</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        <span className="text-green-500">Active — Accepting Submissions</span>
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">
                    {new Date(hackathon.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Timeline */}
          {hasTimeline && (
            <TabsContent value="timeline">
              <h2 className="mb-4 text-lg font-semibold text-white">Timeline</h2>
              <ol className="space-y-3">
                {timeline.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-gray-300">{step}</span>
                  </li>
                ))}
              </ol>
            </TabsContent>
          )}

          {/* Rules */}
          {hasRules && (
            <TabsContent value="rules">
              <div className="space-y-5">
                {hackathon.rules && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-white">Rules</h2>
                    <SectionBlock>{hackathon.rules}</SectionBlock>
                  </div>
                )}
                {hackathon.criteria && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-white">Judging Criteria</h2>
                    <SectionBlock>{hackathon.criteria}</SectionBlock>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* Prizes */}
          {hasPrizes && (
            <TabsContent value="prizes">
              <h2 className="mb-3 text-lg font-semibold text-white">Prizes</h2>
              <SectionBlock>{hackathon.prizes!}</SectionBlock>
            </TabsContent>
          )}

          {/* People */}
          {hasPeople && (
            <TabsContent value="people">
              <div className="space-y-5">
                {hackathon.organizers && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-white">Organizers</h2>
                    <SectionBlock>{hackathon.organizers}</SectionBlock>
                  </div>
                )}
                {judges.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-white">Judges</h2>
                    <div className="space-y-2">
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
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Submission status — unchanged from original */}
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

      {/* How to Participate — unchanged */}
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

      {/* Results — unchanged */}
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
