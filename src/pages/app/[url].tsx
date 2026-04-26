import { api } from "@/trpc/api";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Link, Button } from "@/ui";
import { ArrowLeft, Send } from "@/ui/icons";
import EditHackathon from "@/components/editHackathon";
import Loading from "@/components/loading";
import Prepare from "@/components/prepare";
import ParticipationCard from "@/components/participationCard";
import CopyKey from "@/components/copyKey";
import HackathonInfo from "@/components/hackathonInfo";
import AnnouncementManager from "@/components/announcementManager";
import AnnouncementDisplay from "@/components/announcementDisplay";

function computeAvgScore(
  scores: { score: number; criterionId?: string | null; judge: { id: string } }[],
  criteria: { id: string; weight: number }[],
): number {
  if (criteria.length === 0) {
    const flat = scores.filter((s) => !s.criterionId);
    return flat.length > 0 ? flat.reduce((sum, s) => sum + s.score, 0) / flat.length : 0;
  }
  const byJudge = new Map<string, Map<string, number>>();
  for (const s of scores) {
    if (s.criterionId) {
      if (!byJudge.has(s.judge.id)) byJudge.set(s.judge.id, new Map());
      byJudge.get(s.judge.id)!.set(s.criterionId, s.score);
    }
  }
  let total = 0, count = 0;
  for (const cs of byJudge.values()) {
    if (cs.size < criteria.length) continue;
    let ws = 0;
    for (const c of criteria) ws += (cs.get(c.id) ?? 0) * (c.weight / 100);
    total += ws;
    count++;
  }
  return count > 0 ? total / count : 0;
}

const DashUrl = () => {
  const router = useRouter();
  const { url } = router.query;
  const { data: session } = useSession();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get public hackathon data first
  const { data: publicData, isLoading: publicLoading } =
    api.hackathon.getHackathonPublic.useQuery({
      url: url as string,
    });

  // Get management data only if user is owner
  const { data: managementData, isLoading: managementLoading } =
    api.hackathon.getHackathonManagement.useQuery(
      {
        url: url as string,
      },
      {
        enabled: session?.user?.role === "ADMIN" || (!!publicData?.isOwner && session?.user?.role === "ORGANIZER"),
      },
    );

  // Check if the owner is also a judge (so they can score their own hackathon)
  const { data: ownerJudgeStatus } = api.hackathon.getHackathonJudgeView.useQuery(
    {
      url: url as string,
    },
    {
      enabled: !!publicData?.isOwner && !!managementData?.hackathon?.id,
    },
  );

  // Get judge view data if user might be a judge but not owner
  const { data: judgeData, isLoading: judgeLoading } =
    api.hackathon.getHackathonJudgeView.useQuery(
      {
        url: url as string,
      },
      {
        enabled: !!session?.user && !publicData?.isOwner && session?.user?.role !== "ADMIN",
      },
    );

  const isLoading = publicLoading || (publicData?.isOwner && managementLoading) || (!publicData?.isOwner && judgeLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!publicData || !publicData.hackathon) {
    router.push("/app");
    return null;
  }

  const isOwner = publicData.isOwner;
  const hackathon = publicData.hackathon;
  const userParticipation = publicData.userParticipation;

  // Admin/Owner View
  if (isOwner && managementData) {
    return (
      <>
        <Head>
          <title>{hackathon.name} - Project Hackathon (Management)</title>
        </Head>
        <div className="mt-16 flex w-full flex-col justify-between space-y-3 border-b border-neutral-800 px-6 py-4 md:flex-row md:items-center md:space-y-0">
          <div className="flex items-center space-x-4">
            <Link href="/app">
              <ArrowLeft
                width={24}
                className="cursor-pointer transition-all hover:-translate-x-0.5"
              />
            </Link>
            <h1 className="text-xl font-medium md:text-2xl">
              {hackathon.name}
            </h1>
            <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
              OWNER
            </span>
            {ownerJudgeStatus?.isJudge && (
              <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                JUDGE
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <CopyKey url={hackathon.url} />
            <EditHackathon
              id={hackathon.id}
              key={hackathon.url}
              name={hackathon.name}
              description={hackathon.description || ""}
              url={hackathon.url}
              rules={hackathon.rules || undefined}
              criteria={hackathon.criteria || undefined}
              prizes={(hackathon as any).prizes || undefined}
              matchmaking={(hackathon as any).matchmaking || undefined}
              categories={(hackathon as any).categories || undefined}
              organizers={(hackathon as any).organizers || undefined}
              judges_info={(hackathon as any).judges_info || undefined}
              timeline={(hackathon as any).timeline || undefined}
              sponsors={(hackathon as any).sponsors || undefined}
              sponsors_text={(hackathon as any).sponsors_text || undefined}
              is_finished={hackathon.is_finished}
              max_winners_displayed={(hackathon as any).max_winners_displayed ?? 3}
            />
          </div>
        </div>
        <div className="container mx-auto mt-8 space-y-8 px-6">
          {/* Announcements Section */}
          <div className="rounded-lg border border-neutral-800 p-6">
            <AnnouncementManager
              hackathonId={hackathon.id}
              hackathonUrl={hackathon.url}
            />
          </div>

          {/* Stats Section */}
          <div className="flex items-center space-x-6 rounded-lg border border-neutral-800 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {managementData.participants?.length || 0}
              </div>
              <div className="text-sm text-gray-400">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {managementData.judgeCount || 0}
              </div>
              <div className="text-sm text-gray-400">Judges</div>
            </div>
          </div>

          {/* Participants Section */}
          {managementData.participants && managementData.participants.length > 0 ? (
            (() => {
              const criteria = managementData.criteria ?? [];
              const q = searchQuery.toLowerCase();
              const sorted = [...managementData.participants]
                .filter((p) => {
                  if (!q) return true;
                  const members = (p as any).team_members?.members ?? [];
                  return (
                    p.title.toLowerCase().includes(q) ||
                    p.creatorName.toLowerCase().includes(q) ||
                    ((p as any).team_members?.team_name ?? "").toLowerCase().includes(q) ||
                    members.some((m: any) => m.name?.toLowerCase().includes(q))
                  );
                })
                .sort(
                  (a, b) => computeAvgScore((b as any).scores, criteria) - computeAvgScore((a as any).scores, criteria),
                );
              const uniqueCategories = Array.from(
                new Map(
                  sorted
                    .filter((p) => (p as any).categoryId && (p as any).category)
                    .map((p) => [(p as any).categoryId, (p as any).category.name]),
                ).entries(),
              ).map(([id, name]) => ({ id, name }));
              const hasCategories = uniqueCategories.length > 0;
              const filtered = selectedCategory
                ? sorted.filter((p) => (p as any).categoryId === selectedCategory)
                : sorted;

              return (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Submissions</h2>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by project name, creator or team member..."
                    className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
                  />
                  {hasCategories && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${selectedCategory === null ? "border-white bg-white/10 text-white" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"}`}
                      >
                        All
                      </button>
                      {uniqueCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`rounded-full border px-3 py-1 text-sm transition-colors ${selectedCategory === cat.id ? "border-white bg-white/10 text-white" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {hasCategories && selectedCategory === null ? (
                    <div className="mb-16 space-y-10">
                      {uniqueCategories.map((cat) => {
                        const catItems = filtered.filter((p) => (p as any).categoryId === cat.id);
                        if (catItems.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                              {cat.name}
                            </h3>
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                              {catItems.map((participant) => (
                                <ParticipationCard
                                  key={participant.id}
                                  participation={participant}
                                  criteria={criteria}
                                  isJudging={ownerJudgeStatus?.isJudge || false}
                                  hackathonId={hackathon.id}
                                  isHackathonFinished={hackathon.is_finished}
                                  categoryName={(participant as any).category?.name}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
                      {filtered.map((participant) => (
                        <ParticipationCard
                          key={participant.id}
                          participation={participant}
                          criteria={criteria}
                          isJudging={ownerJudgeStatus?.isJudge || false}
                          hackathonId={hackathon.id}
                          isHackathonFinished={hackathon.is_finished}
                          categoryName={(participant as any).category?.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Prepare url={hackathon.url} />
            </div>
          )}
        </div>
      </>
    );
  }

  // Judge View (not owner but can judge)
  if (judgeData?.isJudge) {
    return (
      <>
        <Head>
          <title>{hackathon.name} - Project Hackathon (Judge View)</title>
        </Head>
        <div className="mt-16 flex w-full flex-col justify-between space-y-3 border-b border-neutral-800 px-6 py-4 md:flex-row md:items-center md:space-y-0">
          <div className="flex items-center space-x-4">
            <Link href="/app">
              <ArrowLeft
                width={24}
                className="cursor-pointer transition-all hover:-translate-x-0.5"
              />
            </Link>
            <h1 className="text-xl font-medium md:text-2xl">
              {hackathon.name}
            </h1>
            <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
              JUDGE
            </span>
          </div>
        </div>
        <div className="container mx-auto mt-8 space-y-8 px-6">
          {/* Submissions Section for Judges */}
          {judgeData.participants && judgeData.participants.length > 0 ? (
            (() => {
              const criteria = judgeData.criteria ?? [];
              const q = searchQuery.toLowerCase();
              const sorted = [...judgeData.participants]
                .filter((p) => {
                  if (!q) return true;
                  const members = (p as any).team_members?.members ?? [];
                  return (
                    p.title.toLowerCase().includes(q) ||
                    p.creatorName.toLowerCase().includes(q) ||
                    ((p as any).team_members?.team_name ?? "").toLowerCase().includes(q) ||
                    members.some((m: any) => m.name?.toLowerCase().includes(q))
                  );
                })
                .sort(
                  (a, b) => computeAvgScore((b as any).scores, criteria) - computeAvgScore((a as any).scores, criteria),
                );
              const uniqueCategories = Array.from(
                new Map(
                  sorted
                    .filter((p) => (p as any).categoryId && (p as any).category)
                    .map((p) => [(p as any).categoryId, (p as any).category.name]),
                ).entries(),
              ).map(([id, name]) => ({ id, name }));
              const hasCategories = uniqueCategories.length > 0;
              const filtered = selectedCategory
                ? sorted.filter((p) => (p as any).categoryId === selectedCategory)
                : sorted;

              return (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                      Submissions to Review ({judgeData.participants.length})
                    </h2>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by project name, creator or team member..."
                    className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
                  />
                  {hasCategories && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${selectedCategory === null ? "border-white bg-white/10 text-white" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"}`}
                      >
                        All
                      </button>
                      {uniqueCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`rounded-full border px-3 py-1 text-sm transition-colors ${selectedCategory === cat.id ? "border-white bg-white/10 text-white" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {hasCategories && selectedCategory === null ? (
                    <div className="mb-16 space-y-10">
                      {uniqueCategories.map((cat) => {
                        const catItems = filtered.filter((p) => (p as any).categoryId === cat.id);
                        if (catItems.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                              {cat.name}
                            </h3>
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                              {catItems.map((participant) => (
                                <ParticipationCard
                                  key={participant.id}
                                  participation={participant}
                                  criteria={criteria}
                                  isJudging={true}
                                  hackathonId={hackathon.id}
                                  isHackathonFinished={hackathon.is_finished}
                                  categoryName={(participant as any).category?.name}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-2">
                      {filtered.map((participant) => (
                        <ParticipationCard
                          key={participant.id}
                          participation={participant}
                          criteria={criteria}
                          isJudging={true}
                          hackathonId={hackathon.id}
                          isHackathonFinished={hackathon.is_finished}
                          categoryName={(participant as any).category?.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="rounded-lg border border-neutral-800 p-8 text-center">
                <h2 className="mb-2 text-xl font-medium">No Submissions Yet</h2>
                <p className="text-gray-400">
                  No participants have submitted projects to this hackathon yet.
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // Regular User View
  return (
    <>
      <Head>
        <title>{hackathon.name} - Project Hackathon</title>
      </Head>
      <div className="mt-16 flex w-full flex-col justify-between space-y-3 border-b border-neutral-800 px-6 py-4 md:flex-row md:items-center md:space-y-0">
        <div className="flex items-center space-x-4">
          <Link href="/app">
            <ArrowLeft
              width={24}
              className="cursor-pointer transition-all hover:-translate-x-0.5"
            />
          </Link>
          <h1 className="text-xl font-medium md:text-2xl">{hackathon.name}</h1>
          {hackathon.is_finished && (
            <span className="rounded-full bg-yellow-600 px-2 py-1 text-xs font-medium text-white">
              FINISHED
            </span>
          )}
        </div>
      </div>

      <AnnouncementDisplay hackathonUrl={hackathon.url} />
      <HackathonInfo
        hackathon={hackathon}
        userParticipation={userParticipation}
      />
    </>
  );
};

export default DashUrl;
