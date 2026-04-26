import { participation } from "@/schema/participation";
import { api } from "@/trpc/api";
import { Button } from "@/ui";

import Check from "@/ui/icons/check";
import Trophy from "@/ui/icons/trophy";
import confetti from "canvas-confetti";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import ViewProject from "./viewProject";
import ScoringInterface from "./scoringInterface";

interface CriterionDef {
  id: string;
  name: string;
  weight: number;
  order: number;
}

interface ScoreEntry {
  id: string;
  score: number;
  criterionId?: string | null;
  judge: {
    id: string;
    userId: string;
    user: {
      name: string | null;
      username: string | null;
    };
  };
}

interface ParticipationWithScores extends participation {
  scores?: ScoreEntry[];
}

interface ParticipationCardProps {
  participation: ParticipationWithScores;
  criteria?: CriterionDef[];
  isJudging?: boolean;
  hackathonId?: string;
  isHackathonFinished?: boolean;
  categoryName?: string;
}

const ParticipationCard = ({ participation: props, criteria = [], isJudging = false, hackathonId, isHackathonFinished = false, categoryName }: ParticipationCardProps) => {
  const [winner, setWinner] = useState<boolean>();
  const [reviewed, setReviewed] = useState<boolean>();
  const [showScoringModal, setShowScoringModal] = useState(false);
  const router = useRouter();

  const { mutate } = api.participation.updateParticipation.useMutation({
    onError: () => {
      setWinner(false);
      setReviewed(false);
    },
  });

  const { data: session } = useSession();
  const scores = props.scores ?? [];
  const hasCriteria = criteria.length > 0;

  // Calculate average score — weighted when criteria exist, flat otherwise
  let averageScore: number | null = null;
  let completeJudgeCount = 0;

  if (hasCriteria) {
    const byJudge = new Map<string, Map<string, number>>();
    for (const s of scores) {
      if (s.criterionId) {
        if (!byJudge.has(s.judge.id)) byJudge.set(s.judge.id, new Map());
        byJudge.get(s.judge.id)!.set(s.criterionId, s.score);
      }
    }
    let total = 0;
    for (const cs of byJudge.values()) {
      if (cs.size < criteria.length) continue;
      let ws = 0;
      for (const c of criteria) ws += (cs.get(c.id) ?? 0) * (c.weight / 100);
      total += ws;
      completeJudgeCount++;
    }
    averageScore = completeJudgeCount > 0 ? total / completeJudgeCount : null;
  } else {
    const flatScores = scores.filter((s) => !s.criterionId);
    averageScore = flatScores.length > 0
      ? flatScores.reduce((sum, s) => sum + s.score, 0) / flatScores.length
      : null;
    completeJudgeCount = flatScores.length;
  }

  // Current user's score
  const myScores = scores.filter((s) => s.judge.userId === session?.user?.id);
  let currentUserScore: number | undefined;
  let currentCriteriaScores: { criterionId: string; score: number }[] | undefined;

  if (hasCriteria) {
    const myCriteriaScores = myScores.filter((s) => s.criterionId);
    if (myCriteriaScores.length === criteria.length) {
      currentUserScore = criteria.reduce(
        (sum, c) =>
          sum + (myCriteriaScores.find((s) => s.criterionId === c.id)?.score ?? 0) * (c.weight / 100),
        0,
      );
    }
    currentCriteriaScores = myCriteriaScores.map((s) => ({
      criterionId: s.criterionId!,
      score: s.score,
    }));
  } else {
    currentUserScore = myScores.find((s) => !s.criterionId)?.score;
  }

  const handleWinner = () => {
    setWinner(true);
    setReviewed(true);
    mutate({
      id: props.id,
      is_winner: true,
      is_reviewed: true,
    });
    confetti({
      spread: 100,
    });
    toast.success(`Winner set for ${props.title} 🎉`);
  };

  const handleReviewed = () => {
    setReviewed(true);
    mutate({
      id: props.id,
      is_winner: false,
      is_reviewed: true,
    });
    toast.success(`Reviewed set for ${props.title} 🔎`);
  };

  const handleScoreSubmitted = () => {
    setShowScoringModal(false);
    // Force a page refresh to show updated scores
    window.location.reload();
  };

  return (
    <div className="rounded-lg bg-neutral-800/40 shadow">
      <div className="w-full p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-md font-bold tracking-tight text-gray-900 dark:text-white md:text-xl">
                {props.title}
              </h3>
              {categoryName && (
                <span className="rounded-full bg-neutral-700 px-2.5 py-0.5 text-xs font-medium text-neutral-300">
                  {categoryName}
                </span>
              )}
            </div>
            <span className="font-mono font-bold text-gray-500">
              {props.creatorName}
            </span>
            {props.team_members && typeof props.team_members === 'object' && props.team_members.members && Array.isArray(props.team_members.members) && (
              <div className="mt-2">
                {props.team_members.team_name && (
                  <div className="text-sm font-medium text-blue-400 mb-1">
                    👥 {props.team_members.team_name}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  Team: {props.team_members.members.map((member: any) => member.name).join(", ")}
                </div>
                <div className="text-xs text-gray-500">
                  {props.team_members.members.length} member{props.team_members.members.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
          
          {/* Score display */}
          <div className="ml-4 text-right">
            {/* Current judge's score */}
            {isJudging && currentUserScore && (
              <div className="mb-1">
                <div className="text-sm text-gray-600 dark:text-gray-400">Your score:</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {currentUserScore}/10
                </div>
              </div>
            )}
            
            {/* Average score */}
            {averageScore !== null && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {isJudging ? "Average:" : "Score:"}
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {averageScore.toFixed(hasCriteria ? 2 : 1)}
                </div>
                <div className="text-xs text-gray-500">
                  {completeJudgeCount} judge{completeJudgeCount !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <p className="mt-3 mb-6 truncate font-light text-gray-500 dark:text-gray-400">
          {props.description}
        </p>

        {/* Individual scores display for organizers */}
        {scores.length > 0 && !isJudging && (
          <div className="mb-4 space-y-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Scores:</p>
            <div className="flex flex-wrap gap-2">
              {hasCriteria
                ? Array.from(new Set(scores.filter((s) => s.criterionId).map((s) => s.judge.id))).map((judgeId) => {
                    const judgeScores = scores.filter((s) => s.judge.id === judgeId && s.criterionId);
                    const judgeInfo = judgeScores[0]?.judge;
                    if (!judgeInfo || judgeScores.length < criteria.length) return null;
                    const weighted = criteria.reduce(
                      (sum, c) => sum + (judgeScores.find((s) => s.criterionId === c.id)?.score ?? 0) * (c.weight / 100),
                      0,
                    );
                    return (
                      <span
                        key={judgeId}
                        className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {judgeInfo.user.name || judgeInfo.user.username || 'Judge'}: {weighted.toFixed(2)}/10
                      </span>
                    );
                  })
                : scores.filter((s) => !s.criterionId).map((score, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {score.judge.user.name || score.judge.user.username || 'Judge'}: {score.score}/10
                    </span>
                  ))}
            </div>
          </div>
        )}
        
        <div className="flex w-full items-center justify-end space-x-2 overflow-x-auto">
          {isJudging ? (
            // Judges see Score and View buttons (Score disabled if hackathon is finished)
            <>
              {isHackathonFinished ? (
                <Button disabled className="cursor-not-allowed opacity-50">
                  Scoring Finished
                </Button>
              ) : (
                <Button
                  onClick={() => setShowScoringModal(true)}
                >
                  {currentUserScore ? "Update Score" : "Score Project"}
                </Button>
              )}
              <ViewProject
                title={props.title}
                description={props.description}
                project_url={props.project_url}
                presentation_url={(props as any).presentation_url}
                categoryName={categoryName}
              />
            </>
          ) : (
            // Organizers see Winner/Reviewed/View buttons (disabled if hackathon is finished)
            <>
              <Button
                icon={<Trophy width={15} />}
                onClick={handleWinner}
                disabled={props.is_winner || winner || isHackathonFinished}
              >
                {props.is_winner || winner ? "Winner" : "Winner"}
              </Button>
              <Button
                icon={<Check width={15} />}
                onClick={handleReviewed}
                disabled={props.is_reviewed || reviewed || isHackathonFinished}
              >
                {props.is_reviewed || reviewed ? "Reviewed" : "Review"}
              </Button>
              <ViewProject
                title={props.title}
                description={props.description}
                project_url={props.project_url}
                presentation_url={(props as any).presentation_url}
                categoryName={categoryName}
              />
            </>
          )}
        </div>
      </div>

      {/* Scoring Modal */}
      {showScoringModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 pt-6 pb-4 flex-shrink-0">
              <h3 className="text-xl font-semibold text-white">
                Score Submission
              </h3>
              <button
                onClick={() => setShowScoringModal(false)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors p-1 rounded hover:bg-neutral-800"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-6 pb-6">
              <ScoringInterface
                participationId={props.id}
                title={props.title}
                creatorName={props.creatorName}
                currentScore={!hasCriteria ? currentUserScore : undefined}
                criteria={criteria}
                currentCriteriaScores={currentCriteriaScores}
                onScoreSubmitted={handleScoreSubmitted}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipationCard;
