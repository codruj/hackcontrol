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

export const hackathonRouter = createTRPCRouter({
  //------
  // Get all hackathons - different behavior based on user role =>
  allHackathons: protectedProcedure.query(async ({ ctx }) => {
    // For ADMIN/ORGANIZER users: show only their created hackathons
    // For USER users: show all available hackathons
    if (ctx.session.user.role === "ADMIN" || ctx.session.user.role === "ORGANIZER") {
      const hackathon = await ctx.prisma.hackathon.findMany({
        where: {
          creatorId: ctx.session.user.id,
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
          url: true,
          is_finished: true,
          updatedAt: true,
          min_judges_required: true,
        },
      });

      if (!hackathon) {
        return {
          hackathon: null,
          winners: [],
        };
      }

      // Get all participations with their scores
      const participations = await ctx.prisma.participation.findMany({
        where: {
          hackathon_url: input.url,
        },
        include: {
          scores: true,
        },
      });

      // Calculate rankings and get top 3
      const ranked = participations
        .map((participation) => {
          const scores = participation.scores;
          const totalScores = scores.length;
          const averageScore = totalScores > 0
            ? scores.reduce((sum, s) => sum + s.score, 0) / totalScores
            : 0;

          return {
            id: participation.id,
            title: participation.title,
            description: participation.description,
            project_url: participation.project_url,
            creatorName: participation.creatorName,
            averageScore,
            totalScores,
            isEligibleForRanking: totalScores >= hackathon.min_judges_required,
          };
        })
        .filter(p => p.isEligibleForRanking)
        .sort((a, b) => {
          if (b.averageScore !== a.averageScore) {
            return b.averageScore - a.averageScore;
          }
          return b.totalScores - a.totalScores;
        })
        .slice(0, 3)
        .map((submission, index) => ({
          ...submission,
          rank: index + 1,
        }));

      return {
        hackathon,
        winners: ranked,
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
      // First check if the user is the creator
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          id: input.id,
          creatorId: ctx.session.user.id,
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
          is_finished: input.is_finished,
        },
      });
      return editHackathon;
    }),

  //------
  // Delete hackathon (ADMIN/ORGANIZER only, and must be creator) =>
  deleteHackathon: organizerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First check if the user is the creator
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          id: input.id,
          creatorId: ctx.session.user.id,
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
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          url: input.url,
          creatorId: ctx.session.user.id,
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

      return {
        hackathon,
        participants,
        judgeCount,
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
          url: true,
          is_finished: true,
          creatorId: true,
          updatedAt: true,
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
        ctx.session?.user?.id === hackathon.creatorId &&
        (ctx.session?.user?.role === "ADMIN" || ctx.session?.user?.role === "ORGANIZER");

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
      // This should only work for hackathon creators
      if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "ORGANIZER") {
        return {
          hackathon: null,
          participants: [],
        };
      }

      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          url: input.url,
          creatorId: ctx.session.user.id,
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
      
      // Check if user can judge this hackathon
      const canJudge = ctx.session.user.role === "ADMIN" ||
        hackathon.creatorId === userId ||
        await ctx.prisma.judge.findUnique({
          where: {
            userId_hackathonId: {
              userId,
              hackathonId: hackathon.id,
            },
          },
        });

      if (!canJudge) {
        return {
          hackathon,
          participants: [],
          isJudge: false,
        };
      }

      // Get participants for this hackathon with scores
      const participants = await ctx.prisma.participation.findMany({
        where: {
          hackathon_url: input.url,
        },
        include: {
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

      return {
        hackathon,
        participants,
        isJudge: true,
      };
    }),

  //------
  // Finish hackathon (ADMIN/ORGANIZER only, must be creator) =>
  finishHackathon: organizerProcedure
    .input(z.object({ url: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First check if the user is the creator
      const hackathon = await ctx.prisma.hackathon.findFirst({
        where: {
          url: input.url,
          creatorId: ctx.session.user.id,
        },
      });

      if (!hackathon) {
        throw new Error(
          "Hackathon not found or you don't have permission to finish it",
        );
      }

      // Get all participations with their scores to determine winners
      const participations = await ctx.prisma.participation.findMany({
        where: {
          hackathon_url: hackathon.url,
        },
        include: {
          scores: true,
        },
      });

      // Calculate rankings using the same logic as the scoring router
      const ranked = participations
        .map((participation) => {
          const scores = participation.scores;
          const totalScores = scores.length;
          const averageScore = totalScores > 0 
            ? scores.reduce((sum, s) => sum + s.score, 0) / totalScores 
            : 0;

          return {
            ...participation,
            averageScore,
            totalScores,
            isEligibleForRanking: totalScores >= hackathon.min_judges_required,
          };
        })
        .filter(p => p.isEligibleForRanking)
        .sort((a, b) => {
          // Sort by average score descending, then by total scores descending as tiebreaker
          if (b.averageScore !== a.averageScore) {
            return b.averageScore - a.averageScore;
          }
          return b.totalScores - a.totalScores;
        });

      // Clear all existing winners first
      await ctx.prisma.participation.updateMany({
        where: {
          hackathon_url: hackathon.url,
        },
        data: {
          is_winner: false,
          is_reviewed: true, // Mark all as reviewed when hackathon finishes
        },
      });

      // Set the top submission as winner (if any eligible submissions exist)
      if (ranked.length > 0) {
        const winner = ranked[0];
        await ctx.prisma.participation.update({
          where: {
            id: winner.id,
          },
          data: {
            is_winner: true,
            is_reviewed: true,
          },
        });
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
        winnersCount: ranked.length > 0 ? 1 : 0,
        totalEligibleSubmissions: ranked.length,
        winnerSubmission: ranked.length > 0 ? {
          title: ranked[0].title,
          creatorName: ranked[0].creatorName,
          averageScore: ranked[0].averageScore,
          totalJudges: ranked[0].totalScores,
        } : null,
      };
    }),
});
