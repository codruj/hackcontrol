import { z } from "zod";
import { createTRPCRouter, organizerProcedure, protectedProcedure, adminProcedure } from "..";

export const judgeRouter = createTRPCRouter({
  //------
  // Add judge to hackathon (ORGANIZER/ADMIN only) =>
  addJudge: organizerProcedure
    .input(z.object({
      hackathonId: z.string(),
      userId: z.string(),
      categoryIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { hackathonId, userId, categoryIds } = input;
      const inviterId = ctx.session.user.id;

      // Check if user can manage this hackathon (if not ADMIN)
      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });

        if (!hackathon || hackathon.creatorId !== inviterId) {
          throw new Error("Not authorized to manage this hackathon");
        }
      }

      // Check if judge already exists
      const existingJudge = await ctx.prisma.judge.findUnique({
        where: {
          userId_hackathonId: {
            userId,
            hackathonId,
          },
        },
      });

      if (existingJudge) {
        throw new Error("User is already a judge for this hackathon");
      }

      const judge = await ctx.prisma.judge.create({
        data: {
          userId,
          hackathonId,
          invitedBy: inviterId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Assign categories if specified
      if (categoryIds && categoryIds.length > 0) {
        await ctx.prisma.judgeCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            judgeId: judge.id,
            categoryId,
          })),
          skipDuplicates: true,
        });
      }

      return judge;
    }),

  //------
  // Remove judge from hackathon (ORGANIZER/ADMIN only) =>
  removeJudge: organizerProcedure
    .input(z.object({ 
      hackathonId: z.string(),
      userId: z.string() 
    }))
    .mutation(async ({ ctx, input }) => {
      const { hackathonId, userId } = input;
      const requesterId = ctx.session.user.id;

      // Check if user can manage this hackathon (if not ADMIN)
      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });

        if (!hackathon || hackathon.creatorId !== requesterId) {
          throw new Error("Not authorized to manage this hackathon");
        }
      }

      const judge = await ctx.prisma.judge.findUnique({
        where: {
          userId_hackathonId: {
            userId,
            hackathonId,
          },
        },
      });

      if (!judge) {
        throw new Error("Judge not found");
      }

      return ctx.prisma.judge.delete({
        where: {
          userId_hackathonId: {
            userId,
            hackathonId,
          },
        },
      });
    }),

  //------
  // Get judges for hackathon =>
  getHackathonJudges: protectedProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.judge.findMany({
        where: {
          hackathonId: input.hackathonId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          inviter: {
            select: {
              id: true,
              name: true,
            },
          },
          judgeCategories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }),

  //------
  // Set category assignments for a judge (replaces existing) =>
  setJudgeCategories: organizerProcedure
    .input(z.object({
      judgeId: z.string(),
      hackathonId: z.string(),
      categoryIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const { judgeId, hackathonId, categoryIds } = input;
      const requesterId = ctx.session.user.id;

      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });
        if (!hackathon || hackathon.creatorId !== requesterId) {
          throw new Error("Not authorized to manage this hackathon");
        }
      }

      const judge = await ctx.prisma.judge.findUnique({
        where: { id: judgeId },
        select: { hackathonId: true },
      });
      if (!judge || judge.hackathonId !== hackathonId) {
        throw new Error("Judge not found in this hackathon");
      }

      // Replace all category assignments
      await ctx.prisma.judgeCategory.deleteMany({ where: { judgeId } });

      if (categoryIds.length > 0) {
        await ctx.prisma.judgeCategory.createMany({
          data: categoryIds.map((categoryId) => ({ judgeId, categoryId })),
          skipDuplicates: true,
        });
      }

      return ctx.prisma.judgeCategory.findMany({
        where: { judgeId },
        include: { category: { select: { id: true, name: true } } },
      });
    }),

  //------
  // Get hackathons user is judging =>
  getJudgedHackathons: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.judge.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        hackathon: {
          select: {
            id: true,
            name: true,
            url: true,
            description: true,
            is_finished: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  //------
  // Search users for judge invitation =>
  searchUsers: protectedProcedure
    .input(z.object({ 
      query: z.string().min(1),
      hackathonId: z.string() 
    }))
    .query(async ({ ctx, input }) => {
      // First get existing judges for this hackathon
      const existingJudges = await ctx.prisma.judge.findMany({
        where: { hackathonId: input.hackathonId },
        select: { userId: true },
      });
      
      const existingJudgeIds = existingJudges.map(j => j.userId);

      // Search users by name or email, excluding existing judges
      return ctx.prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: input.query, mode: 'insensitive' } },
                { email: { contains: input.query, mode: 'insensitive' } },
                { username: { contains: input.query, mode: 'insensitive' } },
              ],
            },
            {
              id: { notIn: existingJudgeIds },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
        },
        take: 10,
      });
    }),

  //------
  // Promote user to ORGANIZER (ADMIN only) =>
  promoteToOrganizer: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          role: "ORGANIZER",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    }),
});