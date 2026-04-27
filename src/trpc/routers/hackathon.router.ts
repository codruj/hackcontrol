import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  organizerProcedure,
} from "..";

// Schemas:
import {
  filterHackathonSchema,
  newHackathonSchema,
  updateHackathonSchema,
} from "@/schema/hackathon";

// Weighted scoring helper (duplicated from scoring.router to avoid circular deps)
function computeWeightedScore(
  scores: { judgeId: string; criterionId: string | null; score: number }[],
  criteria: { id: string; weight: number }[],
): { averageScore: number; completeJudges: number } {
  if (criteria.length === 0) {
    const byJudge = new Map<string, number>();
    for (const s of scores) {
      if (s.criterionId === null) byJudge.set(s.judgeId, s.score);
    }
    const count = byJudge.size;
    const total = Array.from(byJudge.values()).reduce((a, b) => a + b, 0);
    return { averageScore: count > 0 ? total / count : 0, completeJudges: count };
  }
  const byJudge = new Map<string, Map<string, number>>();
  for (const s of scores) {
    if (s.criterionId !== null) {
      if (!byJudge.has(s.judgeId)) byJudge.set(s.judgeId, new Map());
      byJudge.get(s.judgeId)!.set(s.criterionId, s.score);
    }
  }
  let total = 0;
  let completeJudges = 0;
  for (const cs of byJudge.values()) {
    if (cs.size < criteria.length) continue;
    let ws = 0;
    for (const c of criteria) ws += (cs.get(c.id) ?? 0) * (c.weight / 100);
    total += ws;
    completeJudges++;
  }
  return { averageScore: completeJudges > 0 ? total / completeJudges : 0, completeJudges };
}

export const hackathonRouter = createTRPCRouter({
  //------
  // Get all hackathons - different behavior based on user role =>
  allHackathons: protectedProcedure.query(async ({ ctx }) => {
    // For ADMIN/ORGANIZER users: show only their created hackathons
    // For USER users: show all available hackathons
    if (ctx.session.user.role === "ADMIN" || ctx.session.user.role === "ORGANIZER") {
      const isAdmin = ctx.session.user.role === "ADMIN";
      const hackathon = await ctx.prisma.hackathon.findMany({
        where: isAdmin ? {} : { creatorId: ctx.session.user.id },
      });
      const participants = await ctx.prisma.participation.findMany({
        where: {
          creatorId: ctx.session.user.id,
        },
      });
      return {
        hackathon,
        participants,
      };
    } else {
      // Regular users see all available hackathons
      const hackathon = await ctx.prisma.hackathon.findMany({
        where: {
          verified: true, // Only show verified hackathons to regular users
        },
      });
      const participants = await ctx.prisma.participation.findMany({
        where: {
          creatorId: ctx.session.user.id,
        },
      });
      return {
        hackathon,
        participants,
      };
    }
  }),

  //------
  // Get all available hackathons (for all users) =>
  allAvailableHackathons: publicProcedure.query(async ({ ctx }) => {
    const hackathons = await ctx.prisma.hackathon.findMany({
      where: {
        verified: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        is_finished: true,
        updatedAt: true,
      },
    });

    // If user is logged in, also get their participations
    let userParticipations: { hackathon_url: string }[] = [];
    if (ctx.session?.user?.id) {
      userParticipations = await ctx.prisma.participation.findMany({
        where: {
          creatorId: ctx.session.user.id,
        },
        select: {
          hackathon_url: true,
        },
      });
    }

    return {
      hackathons,
      userParticipations,
    };
  }),

  //------
  // Get recent hackathons for public landing page (sorted by most recent) =>
  getRecentHackathons: publicProcedure.query(async ({ ctx }) => {
    const hackathons = await ctx.prisma.hackathon.findMany({
      where: {
        verified: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        is_finished: true,
        updatedAt: true,
      },
    });

    return hackathons;
  }),

  //------
  // Get hackathon with top 3 winners (public) =>
  getHackathonWithWinners: publicProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: {
          url: input.url,
        },
        select: {
          id: true,
          name: true,
          description: true,
          rules: true,
          criteria: true,
          prizes: true,
          matchmaking: true,
          categories: true,
          organizers: true,
          judges_info: true,
          timeline: true,
          sponsors: true,
          url: true,
          is_finished: true,
          updatedAt: true,
          min_judges_required: true,
          max_winners_displayed: true,
          Judge: {
            select: {
              user: {
                select: {
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          hackathonCategories: {
            select: { id: true, name: true },
            orderBy: { createdAt: "asc" as const },
          },
        },
      });

      if (!hackathon) {
        return {
          hackathon: null,
          winners: [],
          categoryWinners: [],
        };
      }

      // Get all participations with their scores and criteria for correct weighted ranking
      const [participations, criteria, judgeCount] = await Promise.all([
        ctx.prisma.participation.findMany({
          where: { hackathon_url: input.url },
          include: { scores: true },
        }),
        ctx.prisma.criterion.findMany({
          where: { hackathonId: hackathon.id },
          orderBy: { order: "asc" },
        }),
        ctx.prisma.judge.count({ where: { hackathonId: hackathon.id } }),
      ]);

      // Use the actual judge count as a ceiling so a single-judge hackathon
      // doesn't require the default min of 2.
      const effectiveMinJudges = Math.min(
        hackathon.min_judges_required,
        Math.max(1, judgeCount),
      );

      const rankSubset = (subset: typeof participations) =>
        subset
          .map((participation) => {
            const { averageScore, completeJudges } = computeWeightedScore(
              participation.scores.map((s) => ({
                judgeId: s.judgeId,
                criterionId: s.criterionId,
                score: s.score,
              })),
              criteria,
            );
            return {
              id: participation.id,
              title: participation.title,
              description: participation.description,
              project_url: participation.project_url,
              creatorName: participation.creatorName,
              averageScore,
              totalScores: completeJudges,
              isEligibleForRanking: completeJudges >= effectiveMinJudges,
            };
          })
          .filter((p) => p.isEligibleForRanking)
          .sort((a, b) =>
            b.averageScore !== a.averageScore
              ? b.averageScore - a.averageScore
              : b.totalScores - a.totalScores,
          )
          .slice(0, hackathon.max_winners_displayed ?? 3)
          .map((submission, index) => ({ ...submission, rank: index + 1 }));

      if (hackathon.hackathonCategories.length > 0) {
        const categoryWinners = hackathon.hackathonCategories.map((category) => ({
          categoryId: category.id,
          categoryName: category.name,
          winners: rankSubset(
            participations.filter((p) => p.categoryId === category.id),
          ),
        }));

        return {
          hackathon,
          winners: [],
          categoryWinners,
        };
      }

      return {
        hackathon,
        winners: rankSubset(participations),
        categoryWinners: [],
      };
    }),

  //------
  // Create new hackathon (ADMIN/ORGANIZER only) =>
  createHackathon: organizerProcedure
    .input(newHackathonSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const newHackathon = await ctx.prisma.hackathon.create({
        data: {
          name: input.name,
          url: input.url,
          description: input.description,
          rules: input.rules,
          criteria: input.criteria,
          prizes: input.prizes,
          matchmaking: input.matchmaking,
          categories: input.categories,
          organizers: input.organizers,
          judges_info: input.judges_info,
          timeline: input.timeline ?? [],
          is_finished: input.is_finished,
          creatorId: userId,
          verified: true, // Auto-verify for now
        },
      });

      // Auto-assign creator as judge for their hackathon
      await ctx.prisma.judge.create({
        data: {
          userId,
          hackathonId: newHackathon.id,
          invitedBy: userId, // Creator invites themselves
        },
      });

      return newHackathon;
    }),

  //------
  // Edit hackathon (ADMIN/ORGANIZER only, and must be creator) =>
  editHackathon: organizerProcedure
    .input(updateHackathonSchema)
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "ADMIN";
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          id: input.id,
          ...(isAdmin ? {} : { creatorId: ctx.session.user.id }),
        },
      });

      if (!hackathon) {
        throw new Error(
          "Hackathon not found or you don't have permission to edit it",
        );
      }

      const editHackathon = await ctx.prisma.hackathon.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          description: input.description,
          rules: input.rules,
          criteria: input.criteria,
          prizes: input.prizes,
          matchmaking: input.matchmaking,
          categories: input.categories,
          organizers: input.organizers,
          judges_info: input.judges_info,
          timeline: input.timeline,
          sponsors: input.sponsors ?? [],
          sponsors_text: input.sponsors_text,
          is_finished: input.is_finished,
          max_winners_displayed: input.max_winners_displayed ?? 3,
        },
      });
      return editHackathon;
    }),

  //------
  // Delete hackathon (ADMIN/ORGANIZER only, and must be creator) =>
  deleteHackathon: organizerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "ADMIN";
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          id: input.id,
          ...(isAdmin ? {} : { creatorId: ctx.session.user.id }),
        },
      });

      if (!hackathon) {
        throw new Error(
          "Hackathon not found or you don't have permission to delete it",
        );
      }

      const deleteHackathon = await ctx.prisma.hackathon.delete({
        where: {
          id: input.id,
        },
      });
      return deleteHackathon;
    }),

  //------
  // Get hackathon management view (ADMIN/ORGANIZER only, must be creator) =>
  getHackathonManagement: organizerProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "ADMIN";
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          url: input.url,
          ...(isAdmin ? {} : { creatorId: ctx.session.user.id }),
        },
      });

      if (!hackathon) {
        return {
          hackathon: null,
          participants: [],
          isOwner: false,
        };
      }

      const participants = await ctx.prisma.participation.findMany({
        where: {
          hackathon_url: input.url,
        },
        include: {
          category: {
            select: { name: true },
          },
          scores: {
            include: {
              judge: {
                select: {
                  id: true,
                  userId: true,
                  user: {
                    select: {
                      name: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const judgeCount = await ctx.prisma.judge.count({
        where: {
          hackathonId: hackathon.id,
        },
      });

      const criteria = await ctx.prisma.criterion.findMany({
        where: { hackathonId: hackathon.id },
        orderBy: { order: "asc" },
      });

      return {
        hackathon,
        participants,
        judgeCount,
        criteria,
        isOwner: true,
      };
    }),

  //------
  // Get hackathon public view (for all users) =>
  getHackathonPublic: publicProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: {
          url: input.url,
        },
        select: {
          id: true,
          name: true,
          description: true,
          rules: true,
          criteria: true,
          prizes: true,
          matchmaking: true,
          categories: true,
          organizers: true,
          judges_info: true,
          timeline: true,
          url: true,
          is_finished: true,
          creatorId: true,
          updatedAt: true,
          Judge: {
            select: {
              user: {
                select: {
                  name: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!hackathon) {
        return {
          hackathon: null,
          userParticipation: null,
          isOwner: false,
        };
      }

      // Check if current user is the owner
      const isOwner =
        ctx.session?.user?.role === "ADMIN" ||
        (ctx.session?.user?.id === hackathon.creatorId &&
          ctx.session?.user?.role === "ORGANIZER");

      // Get user's participation if logged in
      let userParticipation = null;
      if (ctx.session?.user?.id) {
        userParticipation = await ctx.prisma.participation.findFirst({
          where: {
            hackathon_url: input.url,
            creatorId: ctx.session.user.id,
          },
        });
      }

      return {
        hackathon,
        userParticipation,
        isOwner,
      };
    }),

  //------
  // Single hackathon with participants (kept for backward compatibility) =>
  singleHackathonWithParticipants: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "ORGANIZER") {
        return {
          hackathon: null,
          participants: [],
        };
      }

      const isAdmin = ctx.session.user.role === "ADMIN";
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          url: input.url,
          ...(isAdmin ? {} : { creatorId: ctx.session.user.id }),
        },
      });

      if (!hackathon) {
        return {
          hackathon: null,
          participants: [],
        };
      }

      const participants = await ctx.prisma.participation.findMany({
        where: {
          hackathon_url: input.url,
        },
      });

      return {
        hackathon,
        participants,
      };
    }),

  //------
  // Get a single hackathon by URL (for submission page) =>
  singleHackathon: publicProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: {
          url: input.url,
        },
        include: {
          hackathonCategories: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      let participants: any[] = [];
      if (ctx.session?.user?.id) {
        participants = await ctx.prisma.participation.findMany({
          where: {
            hackathon_url: input.url,
            creatorId: ctx.session.user.id,
          },
        });
      }

      return {
        hackathon: JSON.parse(JSON.stringify(hackathon)),
        participants: JSON.parse(JSON.stringify(participants)),
      };
    }),

  //------
  // Get hackathon judge view (for judges only) =>
  getHackathonJudgeView: protectedProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ ctx, input }) => {
      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { url: input.url },
        select: {
          id: true,
          name: true,
          description: true,
          rules: true,
          criteria: true,
          prizes: true,
          matchmaking: true,
          categories: true,
          organizers: true,
          judges_info: true,
          timeline: true,
          url: true,
          is_finished: true,
          creatorId: true,
          updatedAt: true,
        },
      });

      if (!hackathon) {
        return {
          hackathon: null,
          participants: [],
          isJudge: false,
        };
      }

      const userId = ctx.session.user.id;

      // Fetch judge record with category assignments in one query
      const judgeRecord = await ctx.prisma.judge.findUnique({
        where: {
          userId_hackathonId: {
            userId,
            hackathonId: hackathon.id,
          },
        },
        include: {
          judgeCategories: true,
        },
      });

      const canJudge =
        ctx.session.user.role === "ADMIN" ||
        hackathon.creatorId === userId ||
        !!judgeRecord;

      if (!canJudge) {
        return {
          hackathon,
          participants: [],
          isJudge: false,
        };
      }

      // If the judge has explicit category assignments, only show those categories' submissions
      const categoryFilter =
        judgeRecord && judgeRecord.judgeCategories.length > 0
          ? { categoryId: { in: judgeRecord.judgeCategories.map((jc) => jc.categoryId) } }
          : {};

      // Get participants for this hackathon with scores
      const participants = await ctx.prisma.participation.findMany({
        where: {
          hackathon_url: input.url,
          ...categoryFilter,
        },
        include: {
          category: {
            select: { name: true },
          },
          scores: {
            include: {
              judge: {
                select: {
                  id: true,
                  userId: true,
                  user: {
                    select: {
                      name: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const criteria = await ctx.prisma.criterion.findMany({
        where: { hackathonId: hackathon.id },
        orderBy: { order: "asc" },
      });

      return {
        hackathon,
        participants,
        criteria,
        isJudge: true,
      };
    }),

  //------
  // Finish hackathon (ADMIN/ORGANIZER only, must be creator) =>
  finishHackathon: organizerProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.session.user.role === "ADMIN";
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          url: input.url,
          ...(isAdmin ? {} : { creatorId: ctx.session.user.id }),
        },
      });

      if (!hackathon) {
        throw new Error(
          "Hackathon not found or you don't have permission to finish it",
        );
      }

      // Get all participations with their scores to determine winners
      const [participations, criteria, hackathonCategories, judgeCount] = await Promise.all([
        ctx.prisma.participation.findMany({
          where: { hackathon_url: hackathon.url },
          include: { scores: true },
        }),
        ctx.prisma.criterion.findMany({
          where: { hackathonId: hackathon.id },
          orderBy: { order: "asc" },
        }),
        ctx.prisma.hackathonCategory.findMany({
          where: { hackathonId: hackathon.id },
        }),
        ctx.prisma.judge.count({ where: { hackathonId: hackathon.id } }),
      ]);

      const effectiveMinJudges = Math.min(
        hackathon.min_judges_required,
        Math.max(1, judgeCount),
      );

      const rankAll = (subset: typeof participations) =>
        subset
          .map((participation) => {
            const { averageScore, completeJudges } = computeWeightedScore(
              participation.scores,
              criteria,
            );
            return {
              ...participation,
              averageScore,
              totalScores: completeJudges,
              isEligibleForRanking: completeJudges >= effectiveMinJudges,
            };
          })
          .filter((p) => p.isEligibleForRanking)
          .sort((a, b) =>
            b.averageScore !== a.averageScore
              ? b.averageScore - a.averageScore
              : b.totalScores - a.totalScores,
          );

      const ranked = rankAll(participations);

      // Clear all existing winners first
      await ctx.prisma.participation.updateMany({
        where: {
          hackathon_url: hackathon.url,
        },
        data: {
          is_winner: false,
          is_reviewed: true,
        },
      });

      if (hackathonCategories.length > 0) {
        // Mark one winner per category
        for (const category of hackathonCategories) {
          const categoryWinner = ranked.find((p) => p.categoryId === category.id);
          if (categoryWinner) {
            await ctx.prisma.participation.update({
              where: { id: categoryWinner.id },
              data: { is_winner: true, is_reviewed: true },
            });
          }
        }
      } else {
        // Global winner for hackathons with no categories
        if (ranked.length > 0) {
          await ctx.prisma.participation.update({
            where: { id: ranked[0].id },
            data: { is_winner: true, is_reviewed: true },
          });
        }
      }

      // Finish the hackathon
      const finishHackathon = await ctx.prisma.hackathon.update({
        where: {
          id: hackathon.id,
        },
        data: {
          is_finished: true,
        },
      });

      return {
        ...finishHackathon,
        winnersCount: hackathonCategories.length > 0 ? hackathonCategories.length : (ranked.length > 0 ? 1 : 0),
        totalEligibleSubmissions: ranked.length,
      };
    }),
});
