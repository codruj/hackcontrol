import { api } from "@/trpc/api";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Link } from "@/ui";
import { ArrowLeft } from "@/ui/icons";
import Loading from "@/components/loading";
import VolunteerTaskBoard from "@/components/volunteerTaskBoard";
import VolunteerManager from "@/components/volunteerManager";

const VolunteersPage = () => {
  const router = useRouter();
  const { url } = router.query;
  const { data: session } = useSession();
  const [tab, setTab] = useState<"tasks" | "volunteers">("tasks");

  const { data: publicData, isLoading: publicLoading } =
    api.hackathon.getHackathonPublic.useQuery(
      { url: url as string },
      { enabled: !!url },
    );

  const hackathonId = publicData?.hackathon?.id;

  const { data: volunteers, isLoading: volunteersLoading } =
    api.volunteer.getHackathonVolunteers.useQuery(
      { hackathonId: hackathonId! },
      { enabled: !!hackathonId },
    );

  const isLoading = publicLoading || volunteersLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!publicData?.hackathon || !session?.user) {
    router.push("/app");
    return null;
  }

  const hackathon = publicData.hackathon;
  const userId = session.user.id;
  const role = session.user.role;
  const isOwner = publicData.isOwner;
  const isAdmin = role === "ADMIN";
  const isOrganizer = isAdmin || (role === "ORGANIZER" && isOwner);

  const isVolunteer = volunteers?.some((v: { userId: string }) => v.userId === userId) ?? false;

  if (!isOrganizer && !isVolunteer) {
    return (
      <>
        <Head>
          <title>Access Denied</title>
        </Head>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-neutral-400">
            You are not a volunteer for this hackathon.
          </p>
          <Link href="/app">Go to Dashboard</Link>
        </div>
      </>
    );
  }

  const volunteerList = (volunteers ?? []).map((v: { id: string; userId: string; user: { id: string; name: string | null; email: string | null } }) => ({
    id: v.id,
    userId: v.userId,
    user: {
      id: v.user.id,
      name: v.user.name,
      email: v.user.email,
    },
  }));

  return (
    <>
      <Head>
        <title>{hackathon.name} – Volunteers</title>
      </Head>

      <div className="mt-16 flex w-full flex-col justify-between space-y-3 border-b border-neutral-800 px-6 py-4 md:flex-row md:items-center md:space-y-0">
        <div className="flex items-center space-x-4">
          <Link href={`/app/${hackathon.url}`}>
            <ArrowLeft width={24} className="cursor-pointer transition-all hover:-translate-x-0.5" />
          </Link>
          <h1 className="text-xl font-medium md:text-2xl">{hackathon.name}</h1>
          <span className="rounded-full bg-purple-600 px-2 py-1 text-xs font-medium text-white">
            VOLUNTEERS
          </span>
          {isOrganizer && (
            <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
              {isAdmin ? "ADMIN" : "OWNER"}
            </span>
          )}
        </div>
      </div>

      <div className="container mx-auto mt-6 px-4 pb-16 md:px-6">
        {isOrganizer && (
          <div className="mb-6 flex gap-2 border-b border-neutral-800 pb-0">
            <button
              onClick={() => setTab("tasks")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === "tasks"
                  ? "border-white text-white"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              Task Board
            </button>
            <button
              onClick={() => setTab("volunteers")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === "volunteers"
                  ? "border-white text-white"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              Manage Volunteers
            </button>
          </div>
        )}

        {tab === "tasks" && (
          <VolunteerTaskBoard
            hackathonId={hackathon.id}
            isOrganizer={isOrganizer}
            currentUserId={userId}
            volunteers={volunteerList}
          />
        )}

        {tab === "volunteers" && isOrganizer && (
          <VolunteerManager hackathonId={hackathon.id} />
        )}
      </div>
    </>
  );
};

export default VolunteersPage;
