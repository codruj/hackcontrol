import { api } from "@/trpc/api";
import { Button } from "@/ui";
import { useState } from "react";
import { toast } from "sonner";

interface CriterionDef {
  id: string;
  name: string;
  weight: number;
  order: number;
}

interface ScoringInterfaceProps {
  participationId: string;
  title: string;
  creatorName: string;
  currentScore?: number;
  criteria?: CriterionDef[];
  currentCriteriaScores?: { criterionId: string; score: number }[];
  onScoreSubmitted?: () => void;
}

const ScoringInterface = ({
  participationId,
  title,
  creatorName,
  currentScore,
  criteria = [],
  currentCriteriaScores,
  onScoreSubmitted,
}: ScoringInterfaceProps) => {
  const hasCriteria = criteria.length > 0;

  // Flat mode state (original)
  const [selectedScore, setSelectedScore] = useState<number>(currentScore || 0);

  // Criteria mode state
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    if (currentCriteriaScores) {
      for (const cs of currentCriteriaScores) init[cs.criterionId] = cs.score;
    }
    return init;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutate: submitScore } = api.scoring.submitScore.useMutation({
    onSuccess: () => {
      if (!hasCriteria) toast.success(`Score ${selectedScore}/10 submitted for ${title}`);
      else toast.success(`Scorurile au fost trimise pentru ${title}`);
      setIsSubmitting(false);
      onScoreSubmitted?.();
    },
    onError: (error) => {
      toast.error(`Failed to submit score: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleScoreSubmit = () => {
    if (hasCriteria) {
      const missing = criteria.filter((c) => !criteriaScores[c.id]);
      if (missing.length > 0) {
        toast.error(`Acordă note pentru toate criteriile`);
        return;
      }
      setIsSubmitting(true);
      submitScore({
        participationId,
        criteriaScores: criteria.map((c) => ({
          criterionId: c.id,
          score: criteriaScores[c.id]!,
        })),
      });
    } else {
      if (selectedScore === 0) {
        toast.error("Please select a score between 1-10");
        return;
      }
      setIsSubmitting(true);
      submitScore({ participationId, score: selectedScore });
    }
  };

  const scoreButtons = Array.from({ length: 10 }, (_, i) => i + 1);

  // Weighted preview
  const allScored = hasCriteria && criteria.every((c) => criteriaScores[c.id] !== undefined);
  const weightedPreview = allScored
    ? criteria.reduce((sum, c) => sum + (criteriaScores[c.id]! * c.weight) / 100, 0)
    : null;

  const isEditing = hasCriteria
    ? currentCriteriaScores && currentCriteriaScores.length > 0
    : !!currentScore;

  // ── Criteria mode ──────────────────────────────────────────────
  if (hasCriteria) {
    return (
      <div className="space-y-6">
        <div className="text-center border-b border-neutral-800 pb-4">
          <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
          <p className="text-sm text-neutral-400">by {creatorName}</p>
        </div>

        {criteria.map((c) => (
          <div key={c.id}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-200">{c.name}</span>
              <span className="text-xs text-neutral-500 font-mono">{c.weight}%</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {scoreButtons.map((s) => (
                <button
                  key={s}
                  onClick={() => setCriteriaScores((prev) => ({ ...prev, [c.id]: s }))}
                  className={`h-12 w-12 rounded-lg border-2 font-bold transition-all ${
                    criteriaScores[c.id] === s
                      ? "border-blue-500 bg-blue-500 text-white shadow-lg scale-105"
                      : "border-neutral-600 bg-neutral-800 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-700 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}

        {weightedPreview !== null && (
          <div className="text-center space-y-4">
            <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
              <p className="text-sm text-neutral-400 mb-1">Scor ponderat:</p>
              <p className="text-2xl font-bold text-white">{weightedPreview.toFixed(2)}/10</p>
            </div>
            <Button
              onClick={handleScoreSubmit}
              disabled={isSubmitting}
              loadingstatus={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Se trimite..." : isEditing ? "Actualizează scorurile" : "Trimite scorurile"}
            </Button>
          </div>
        )}

        {!allScored && (
          <Button
            onClick={handleScoreSubmit}
            disabled={true}
            className="w-full opacity-50 cursor-not-allowed"
          >
            Acordă note pentru toate criteriile
          </Button>
        )}
      </div>
    );
  }

  // ── Flat mode (original UI, unchanged) ─────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center border-b border-neutral-800 pb-4">
        <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
        <p className="text-sm text-neutral-400">by {creatorName}</p>
      </div>

      <div>
        <p className="text-sm font-medium text-neutral-300 mb-3 text-center">
          Select a score (1-10)
        </p>
        <div className="grid grid-cols-5 gap-2">
          {scoreButtons.map((score) => (
            <button
              key={score}
              onClick={() => setSelectedScore(score)}
              className={`h-12 w-12 rounded-lg border-2 font-bold transition-all ${
                selectedScore === score
                  ? "border-blue-500 bg-blue-500 text-white shadow-lg scale-105"
                  : "border-neutral-600 bg-neutral-800 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              {score}
            </button>
          ))}
        </div>
      </div>

      {selectedScore > 0 && (
        <div className="text-center space-y-4">
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <p className="text-sm text-neutral-400 mb-1">Selected score:</p>
            <p className="text-2xl font-bold text-white">{selectedScore}/10</p>
            {currentScore && currentScore !== selectedScore && (
              <p className="text-sm text-orange-400 mt-2">Current score: {currentScore}/10</p>
            )}
          </div>
          <Button
            onClick={handleScoreSubmit}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {isSubmitting ? "Submitting..." : currentScore ? "Update Score" : "Submit Score"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScoringInterface;
