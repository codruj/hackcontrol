import { api } from "@/trpc/api";
import { Button } from "@/ui";
import Trophy from "@/ui/icons/trophy";
import { useState } from "react";

interface LeaderboardDisplayProps {
  hackathonId: string;
  hackathonUrl: string;
  isOrganizer?: boolean;
}

const LeaderboardDisplay = ({ hackathonId, hackathonUrl, isOrganizer = false }: LeaderboardDisplayProps) => {
  const [showIneligible, setShowIneligible] = useState(false);

  const { data: rankings, isLoading, error } = api.scoring.calculateRankings.useQuery(
    { hackathonId },
    { refetchInterval: 30000 } // Refresh every 30 seconds for live updates
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Failed to load rankings: {error.message}
        </p>
      </div>
    );
  }

  if (!rankings) {
    return null;
  }

  const { eligible, ineligible, minJudgesRequired } = rankings;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-600 dark:text-yellow-400";
    if (rank === 2) return "text-gray-600 dark:text-gray-400";
    if (rank === 3) return "text-orange-600 dark:text-orange-400";
    return "text-gray-700 dark:text-gray-300";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🏆 Leaderboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Minimum {minJudgesRequired} judge{minJudgesRequired !== 1 ? 's' : ''} required for ranking
        </p>
      </div>

      {/* Eligible Rankings */}
      {eligible.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Official Rankings ({eligible.length} submissions)
          </h3>
          
          <div className="space-y-3">
            {eligible.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-lg border-2 p-4 ${
                  entry.isPodium
                    ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
                    : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`text-2xl font-bold ${getRankColor(entry.rank)}`}>
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {entry.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {entry.creatorName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {entry.averageScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {entry.totalScores} judge{entry.totalScores !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Individual scores for organizers */}
                {isOrganizer && entry.scores.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Individual Scores:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {entry.scores.map((score, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          Judge: {score.score}/10
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Trophy width={48} height={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            No submissions have reached the minimum judge requirement yet.
          </p>
        </div>
      )}

      {/* Ineligible Submissions */}
      {ineligible.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pending Evaluation ({ineligible.length} submissions)
            </h3>
            <button
              onClick={() => setShowIneligible(!showIneligible)}
              className="rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {showIneligible ? "Hide" : "Show"} Pending
            </button>
          </div>

          {showIneligible && (
            <div className="space-y-2">
              {ineligible.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {entry.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {entry.creatorName}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      {entry.totalScores > 0 ? (
                        <>
                          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            {entry.averageScore.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.totalScores}/{minJudgesRequired} judges
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Not scored yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Rankings update automatically every 30 seconds
      </div>
    </div>
  );
};

export default LeaderboardDisplay;