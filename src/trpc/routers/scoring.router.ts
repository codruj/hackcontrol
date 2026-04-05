import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "..";

// Helper: compute weighted average score and number of complete judges for a participation
function computeWeightedScore(
  scores: { judgeId: string; criterionId: string | null; score: number }[],
  criteria: { id: string; weight: number }[],
): { averageScore: number; completeJudges: number } {
  if (criteria.length === 0) {
    // Flat scoring mode
    const byJudge = new Map<string, number>();
    for (const s of scores) {
      if (s.criterionId === null) byJudge.set(s.judgeId, s.score);
    }
    const count = byJudge.size;
    const total = Array.from(byJudge.values()).reduce((a, b) => a + b, 0);
    return { averageScore: count > 0 ? total / count : 0, completeJudges: count };
  }

  // Criteria scoring mode: group by judge, keep only complete judges
  const byJudge = new Map<string, Map<string, number>>();
  for (const s of scores) {
    if (s.criterionId !== null) {
      if (!byJudge.has(s.judgeId)) byJudge.set(s.judgeId, new Map());
      byJudge.get(s.judgeId)!.set(s.criterionId, s.score);
    }
  }

  let total = 0;
  let completeJudges = 0;
  for (const criterionScores of byJudge.values()) {
    if (criterionScores.size < criteria.length) continue;
    let ws = 0;
    for (const c of criteria) ws += (criterionScores.get(c.id) ?? 0) * (c.weight / 100);
    total += ws;
    completeJudges++;
  }

  return { averageScore: completeJudges > 0 ? total / completeJudges : 0, completeJudges };
}

export const scoringRouter = createTRPCRouter({
  //------
  // Submit score (judges only) =>
  submitScore: protectedProcedure
    .input(
      z.union([
        // Flat scoring (no criteria)
        z.object({
          participationId: z.string(),
          score: z.number().min(1).max(10),
          criteriaScores: z.undefined().optional(),
        }),
        // Per-criterion scoring
        z.object({
          participationId: z.string(),
          score: z.undefined().optional(),
          criteriaScores: z.array(
            z.object({
              criterionId: z.string(),
              score: z.number().min(1).max(10),
            }),
          ).min(1),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the participation to find the hackathon
      const participation = await ctx.prisma.participation.findUnique({
        where: { id: input.participationId },
        include: {
          hackathon: {
            select: {
              id: true,
              creatorId: true,
            },
          },
        },
      });

      if (!participation) {
        throw new Error("Participation not found");
      }

      const hackathonId = participation.hackathon?.id;
      if (!hackathonId) {
        throw new Error("Hackathon not found");
      }

      // Check if user can judge this hackathon
      const canJudge = ctx.session.user.role === "ADMIN" ||
        participation.hackathon?.creatorId === userId ||
        await ctx.prisma.judge.findUnique({
          where: {
            userId_hackathonId: {
              userId,
              hackathonId,
            },
          },
        });

      if (!canJudge) {
        throw new Error("Not authorized to judge this hackathon");
      }

      // Find the judge record to get judgeId
      const judge = await ctx.prisma.judge.findUnique({
        where: {
          userId_hackathonId: {
            userId,
            hackathonId,
          },
        },
      });

      if (!judge) {
        throw new Error("Judge record not found");
      }

      // Per-criterion scoring
      if (input.criteriaScores && input.criteriaScores.length > 0) {
        for (const cs of input.criteriaScores) {
          await ctx.prisma.score.upsert({
            where: {
              judgeId_participationId_criterionId: {
                judgeId: judge.id,
                participationId: input.participationId,
                criterionId: cs.criterionId,
              },
            },
            update: { score: cs.score },
            create: {
              judgeId: judge.id,
              participationId: input.participationId,
              criterionId: cs.criterionId,
              score: cs.score,
            },
          });
        }
        return { success: true };
      }

      // Flat scoring (criterionId = null) — use findFirst+update/create
      // because upsert doesn't work reliably with NULL in unique constraints
      const existing = await ctx.prisma.score.findFirst({
        where: {
          judgeId: judge.id,
          participationId: input.participationId,
          criterionId: null,
        },
      });

      if (existing) {
        return ctx.prisma.score.update({
          where: { id: existing.id },
          data: { score: input.score! },
        });
      }

      return ctx.prisma.score.create({
        data: {
          judgeId: judge.id,
          participationId: input.participationId,
          score: input.score!,
          criterionId: null,
        },
      });
    }),

  //------
  // Get all scores for a submission =>
  getSubmissionScores: publicProcedure
    .input(z.object({ participationId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.score.findMany({
        where: {
          participationId: input.participationId,
        },
        include: {
          judge: {
            include: {
              user: {
                select: {
                  name: true,
                  username: true,
                },
              },
            },
          },
        },
      });
    }),

  //------
  // Get all scores by a specific judge for a hackathon =>
  getJudgeScores: protectedProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Find the judge record
      const judge = await ctx.prisma.judge.findUnique({
        where: {
          userId_hackathonId: {
            userId,
            hackathonId: input.hackathonId,
          },
        },
      });

      if (!judge) {
        throw new Error("Judge record not found");
      }

      return ctx.prisma.score.findMany({
        where: {
          judgeId: judge.id,
        },
        include: {
          participation: {
            select: {
              id: true,
              title: true,
              description: true,
              project_url: true,
              creatorName: true,
            },
          },
        },
      });
    }),

  //------
  // Calculate rankings for a hackathon =>
  calculateRankings: publicProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { min_judges_required: true, url: true },
      });

      if (!hackathon) {
        throw new Error("Hackathon not found");
      }

      const criteria = await ctx.prisma.criterion.findMany({
        where: { hackathonId: input.hackathonId },
        orderBy: { order: "asc" },
      });

      const participations = await ctx.prisma.participation.findMany({
        where: { hackathon_url: hackathon.url },
        include: { scores: true },
      });

      const enrich = (participation: (typeof participations)[number]) => {
        const { averageScore, completeJudges } = computeWeightedScore(
          participation.scores,
          criteria,
        );
        return {
          ...participation,
          averageScore,
          totalScores: completeJudges,
          isEligibleForRanking: completeJudges >= hackathon.min_judges_required,
        };
      };

      const enriched = participations.map(enrich);

      const ranked = enriched
        .filter(p => p.isEligibleForRanking)
        .sort((a, b) => {
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return b.totalScores - a.totalScores;
        })
        .map((s, i) => ({ ...s, rank: i + 1, isWinner: i === 0, isPodium: i < 3 }));

      const ineligible = enriched.filter(p => !p.isEligibleForRanking);

      return { eligible: ranked, ineligible, minJudgesRequired: hackathon.min_judges_required };
    }),

  //------
  // Update minimum judges required (organizer only) =>
  updateMinJudges: protectedProcedure
    .input(
      z.object({
        hackathonId: z.string(),
        minJudges: z.number().min(1).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Check if user is organizer or admin
      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true },
      });

      if (!hackathon) {
        throw new Error("Hackathon not found");
      }

      const canUpdate = ctx.session.user.role === "ADMIN" || hackathon.creatorId === userId;

      if (!canUpdate) {
        throw new Error("Not authorized to update this hackathon");
      }

      return ctx.prisma.hackathon.update({
        where: { id: input.hackathonId },
        data: { min_judges_required: input.minJudges },
      });
    }),
});