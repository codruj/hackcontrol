import { api } from "@/trpc/api";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { Link } from "@/ui";
import { ArrowLeft } from "@/ui/icons";
import Loading from "@/components/loading";
import MentorManager from "@/components/mentorManager";
import MentorAvailability from "@/components/mentorAvailability";
import MentorBooking from "@/components/mentorBooking";

type Tab = "book" | "availability" | "manage";

const MentorsPage = () => {
  const router = useRouter();
  const { url } = router.query;
  const { data: session } = useSession();

  const { data: publicData, isLoading: publicLoading } = api.hackathon.getHackathonPublic.useQuery(
    { url: url as string },
    { enabled: !!url },
  );

  const hackathonId = publicData?.hackathon?.id ?? "";

  const { data: mentors, isLoading: mentorsLoading } = api.mentor.getHackathonMentors.useQuery(
    { hackathonId },
    { enabled: !!hackathonId },
  );

  const isLoading = publicLoading || mentorsLoading;

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loading /></div>;
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
  const isMentor = (mentors as Array<{ userId: string }> | undefined)?.some((m) => m.userId === userId) ?? false;

  const hasAccess = isOrganizer || isMentor;

  const defaultTab: Tab = isMentor ? "availability" : "book";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "book", label: "Book a Mentor", show: true },
    { id: "availability", label: "My Availability", show: isMentor },
    { id: "manage", label: "Manage Mentors", show: isOrganizer },
  ];

  return (
    <>
      <Head>
        <title>{hackathon.name} – Mentors</title>
      </Head>

      <div className="mt-16 flex w-full flex-col justify-between space-y-3 border-b border-neutral-800 px-6 py-4 md:flex-row md:items-center md:space-y-0">
        <div className="flex items-center space-x-4">
          <Link href={`/app/${hackathon.url}`}>
            <ArrowLeft width={24} className="cursor-pointer transition-all hover:-translate-x-0.5" />
          </Link>
          <h1 className="text-xl font-medium md:text-2xl">{hackathon.name}</h1>
          <span className="rounded-full bg-amber-600 px-2 py-1 text-xs font-medium text-white">MENTORS</span>
          {isOrganizer && (
            <span className="rounded-full bg-green-600 px-2 py-1 text-xs font-medium text-white">
              {isAdmin ? "ADMIN" : "OWNER"}
            </span>
          )}
          {isMentor && (
            <span className="rounded-full bg-amber-700 px-2 py-1 text-xs font-medium text-white">MENTOR</span>
          )}
        </div>
      </div>

      <div className="container mx-auto mt-6 px-4 pb-16 md:px-6">
        <div className="mb-6 flex gap-0 border-b border-neutral-800">
          {tabs.filter((t) => t.show).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors -mb-px ${
                tab === t.id
                  ? "border-white text-white"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "book" && (
          <MentorBooking hackathonId={hackathon.id} currentUserId={userId} isOrganizer={isOrganizer} />
        )}
        {tab === "availability" && isMentor && (
          <MentorAvailability hackathonId={hackathon.id} />
        )}
        {tab === "manage" && isOrganizer && (
          <MentorManager hackathonId={hackathon.id} />
        )}
      </div>
    </>
  );
};

export default MentorsPage;
