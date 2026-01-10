import { useRouter } from "next/router";
import Link from "next/link";
import { api } from "@/trpc/api";
import Up from "@/animations/up";
import { ArrowLeft, Trophy } from "@/ui/icons";
import { ButtonStyles } from "@/ui/button";
import clsx from "clsx";

const getPodiumIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return "";
  }
};

export default function PublicHackathonPage() {
  const router = useRouter();
  const { url } = router.query;

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
        <Link href="/" className={clsx(ButtonStyles)}>
          <div className="flex items-center space-x-2">
            <ArrowLeft width={16} />
            <span>Back to Home</span>
          </div>
        </Link>
      </div>
    );
  }

  const { hackathon, winners } = data;

  return (
    <div className="flex min-h-screen flex-col items-center py-8">
      <div className="w-full max-w-4xl px-4">
        <Up>
          <Link href="/" className="mb-6 inline-flex items-center space-x-2 text-gray-400 hover:text-white">
            <ArrowLeft width={16} />
            <span>Back to Home</span>
          </Link>

          {/* Hackathon Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">{hackathon.name}</h1>
              {hackathon.is_finished && (
                <span className="rounded bg-green-600 px-3 py-1 text-sm">
                  Finished
                </span>
              )}
            </div>
            {hackathon.description && (
              <p className="mt-3 text-lg text-gray-400">{hackathon.description}</p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Last updated: {new Date(hackathon.updatedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Rules & Criteria */}
          {(hackathon.rules || hackathon.criteria) && (
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              {hackathon.rules && (
                <div className="rounded-md bg-white bg-opacity-5 p-4">
                  <h3 className="mb-2 font-medium text-neutral-200">Rules</h3>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">{hackathon.rules}</p>
                </div>
              )}
              {hackathon.criteria && (
                <div className="rounded-md bg-white bg-opacity-5 p-4">
                  <h3 className="mb-2 font-medium text-neutral-200">Criteria</h3>
                  <p className="text-sm text-gray-400 whitespace-pre-wrap">{hackathon.criteria}</p>
                </div>
              )}
            </div>
          )}

          {/* Winners Section */}
          <div>
            <div className="mb-4 flex items-center space-x-2">
              <Trophy width={24} className="text-yellow-500" />
              <h2 className="text-xl font-medium text-neutral-200">Top Winners</h2>
            </div>

            {!hackathon.is_finished ? (
              <div className="rounded-md bg-blue-600 bg-opacity-10 border border-blue-600 border-opacity-30 p-6 text-center">
                <p className="text-lg text-blue-300">
                  The hackathon is still ongoing!
                </p>
                <p className="mt-2 text-gray-400">
                  Stay tuned for the winners once the hackathon concludes.
                </p>
              </div>
            ) : winners.length > 0 ? (
              <div className="space-y-4">
                {winners.map((winner) => (
                  <div
                    key={winner.id}
                    className={clsx(
                      "rounded-md p-4 transition-all",
                      winner.rank === 1
                        ? "bg-yellow-600 bg-opacity-20 border border-yellow-600 border-opacity-30"
                        : winner.rank === 2
                        ? "bg-gray-400 bg-opacity-20 border border-gray-400 border-opacity-30"
                        : "bg-orange-700 bg-opacity-20 border border-orange-700 border-opacity-30"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getPodiumIcon(winner.rank)}</span>
                        <div>
                          <h3 className="text-lg font-medium">{winner.title}</h3>
                          <p className="text-sm text-gray-400">by {winner.creatorName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {winner.averageScore.toFixed(1)}/10
                        </p>
                        <p className="text-xs text-gray-400">
                          {winner.totalScores} judge{winner.totalScores !== 1 ? "s" : ""}
                        </p>
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
                <p className="text-gray-400">
                  No eligible submissions for this hackathon.
                </p>
              </div>
            )}
          </div>
        </Up>
      </div>
    </div>
  );
}
