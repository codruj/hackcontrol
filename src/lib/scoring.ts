// Scoring system utilities and types

export interface LeaderboardEntry {
  id: string;
  rank: number;
  title: string;
  description: string;
  project_url: string;
  creatorName: string;
  averageScore: number;
  totalJudges: number;
  isWinner: boolean;
  isPodium: boolean;
  scores: Array<{
    id: string;
    score: number;
    judge: {
      user: {
        name: string | null;
        username: string | null;
      };
    };
  }>;
}

export interface ParticipationWithScores {
  id: string;
  title: string;
  description: string;
  project_url: string;
  creatorName: string;
  createdAt: Date;
  team_members?: any;
  scores: Array<{
    id: string;
    score: number;
    judge: {
      user: {
        name: string | null;
        username: string | null;
      };
    };
  }>;
}

export interface RankingResult {
  eligible: LeaderboardEntry[];
  ineligible: Array<ParticipationWithScores & {
    averageScore: number;
    totalScores: number;
    isEligibleForRanking: boolean;
  }>;
  minJudgesRequired: number;
}

/**
 * Check if a submission is eligible for ranking based on minimum judges requirement
 */
export function isEligibleForRanking(
  submission: ParticipationWithScores,
  minJudgesRequired: number
): boolean {
  return submission.scores.length >= minJudgesRequired;
}

/**
 * Calculate average score for a submission
 */
export function calculateAverageScore(scores: Array<{ score: number }>): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
}

/**
 * Calculate rankings for a list of participations
 */
export function calculateRankings(
  participations: ParticipationWithScores[],
  minJudgesRequired: number
): RankingResult {
  // Calculate scores and eligibility for all submissions
  const enriched = participations.map((participation) => {
    const averageScore = calculateAverageScore(participation.scores);
    const totalScores = participation.scores.length;
    const eligible = isEligibleForRanking(participation, minJudgesRequired);

    return {
      ...participation,
      averageScore,
      totalScores,
      isEligibleForRanking: eligible,
    };
  });

  // Separate eligible and ineligible submissions
  const eligible = enriched.filter(p => p.isEligibleForRanking);
  const ineligible = enriched.filter(p => !p.isEligibleForRanking);

  // Sort eligible submissions by average score (descending), then by total judges as tiebreaker
  const ranked = eligible
    .sort((a, b) => {
      if (b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      return b.totalScores - a.totalScores;
    })
    .map((submission, index): LeaderboardEntry => ({
      id: submission.id,
      rank: index + 1,
      title: submission.title,
      description: submission.description,
      project_url: submission.project_url,
      creatorName: submission.creatorName,
      averageScore: submission.averageScore,
      totalJudges: submission.totalScores,
      isWinner: index === 0,
      isPodium: index < 3,
      scores: submission.scores,
    }));

  return {
    eligible: ranked,
    ineligible,
    minJudgesRequired,
  };
}

/**
 * Handle ties with random selection (future enhancement)
 */
export function assignRanksWithTiebreaker(
  submissions: Array<{ averageScore: number }>
): Array<{ rank: number }> {
  // For now, just assign sequential ranks
  // In the future, this could implement random tiebreaking
  return submissions.map((_, index) => ({ rank: index + 1 }));
}

/**
 * Get scoring progress for a judge in a hackathon
 */
export function calculateScoringProgress(
  totalSubmissions: number,
  scoredSubmissions: number
): {
  completed: number;
  remaining: number;
  percentage: number;
} {
  const remaining = Math.max(0, totalSubmissions - scoredSubmissions);
  const percentage = totalSubmissions > 0 ? (scoredSubmissions / totalSubmissions) * 100 : 0;

  return {
    completed: scoredSubmissions,
    remaining,
    percentage: Math.round(percentage),
  };
}
