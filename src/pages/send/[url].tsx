import Head from "next/head";
import { api } from "@/trpc/api";
import { useRouter } from "next/router";

import Loading from "@/components/loading";
import SendProject from "@/components/sendProject";
import EditSubmission from "@/components/editSubmission";

const Send = () => {
  const router = useRouter();
  const { url } = router.query;

  const { data, isLoading, error, refetch } = api.hackathon.singleHackathon.useQuery({
    url: url as string,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (error || !data.hackathon) {
    return router.push("/404");
  }

  const hackathon = data.hackathon;
  const submission = data.participants[0] ?? null;

  return (
    <>
      <Head>
        <title>
          {submission ? `Edit submission: ${hackathon.name}` : `Send project: ${hackathon.name}`} - Project Hackathon
        </title>
      </Head>
      <div className="mx-auto flex min-h-screen w-full flex-col items-center justify-center px-4 py-8 sm:px-6">
        {submission ? (
          <EditSubmission
            submission={submission}
            hackathonName={hackathon.name}
            hackathonDescription={hackathon.description}
            isFinished={hackathon.is_finished}
            onSaved={() => refetch()}
            onDeleted={() => refetch()}
          />
        ) : (
          <SendProject
            id={hackathon.id}
            url={hackathon.url}
            name={hackathon.name}
            description={hackathon.description}
            is_finished={hackathon.is_finished}
            categories={hackathon.hackathonCategories ?? []}
          />
        )}
      </div>
    </>
  );
};

export default Send;
