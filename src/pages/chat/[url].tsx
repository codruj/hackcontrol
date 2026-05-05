import { api } from "@/trpc/api";
import Head from "next/head";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

import { Link } from "@/ui";
import { ArrowLeft } from "@/ui/icons";
import Loading from "@/components/loading";
import ChatView from "@/components/chatView";

const ChatPage = () => {
  const router = useRouter();
  const { url } = router.query;
  const { data: session } = useSession();

  const { data: publicData, isLoading } = api.hackathon.getHackathonPublic.useQuery(
    { url: url as string },
    { enabled: !!url },
  );

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loading /></div>;
  }

  if (!publicData?.hackathon || !session?.user) {
    router.push("/app");
    return null;
  }

  const hackathon = publicData.hackathon;
  const userId = session.user.id;

  return (
    <>
      <Head>
        <title>{hackathon.name} – Chat</title>
      </Head>

      <div className="mt-16 flex w-full items-center space-x-4 border-b border-neutral-800 px-6 py-4">
        <Link href={`/app/${hackathon.url}`}>
          <ArrowLeft width={24} className="cursor-pointer transition-all hover:-translate-x-0.5" />
        </Link>
        <h1 className="text-xl font-medium">{hackathon.name}</h1>
        <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">CHAT</span>
      </div>

      <div className="container mx-auto px-4 py-6 md:px-6">
        <ChatView hackathonId={hackathon.id} currentUserId={userId} />
      </div>
    </>
  );
};

export default ChatPage;
