import {
  newParticipationSchema,
  participationSchema,
  updateParticipationSchema,
} from "@/schema/participation";
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "..";

export const participationRouter = createTRPCRouter({
  //------
  // Get all participations by user =>
  allParticipations: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.participation.findMany({
      where: {
        createdBy: ctx.session?.user?.id,
      },
    });
  }),
  //------
  // Get participation by hackathon_id =>
  participationByHackathonId: publicProcedure
    .input(z.object({ hackathonUrl: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.participation.findMany({
        where: {
          hackathon_url: input.hackathonUrl,
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
    }),
  //------
  // Create participation =>
  createParticipation: publicProcedure
    .input(newParticipationSchema)
    .mutation(async ({ ctx, input }) => {
      const participation = await ctx.prisma.participation.create({
        data: {
          ...input,
          creatorId: ctx.session?.user?.id,
          creatorName: ctx.session?.user?.name,
        },
      });

      if (ctx.session?.user?.id) {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { url: input.hackathon_url },
          select: { id: true },
        });
        if (hackathon) {
          await ctx.prisma.hackathonEnrollment.upsert({
            where: { userId_hackathonId: { userId: ctx.session.user.id, hackathonId: hackathon.id } },
            create: { userId: ctx.session.user.id, hackathonId: hackathon.id },
            update: {},
          });
        }
      }

      return participation;
    }),
  //------
  // Update participation (judges only) =>
  updateParticipation: protectedProcedure
    .input(updateParticipationSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the participation to find the hackathon
      const participation = await ctx.prisma.participation.findUnique({
        where: { id: input.id },
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

      return ctx.prisma.participation.update({
        where: {
          id: input.id,
        },
        data: {
          ...input,
        },
      });
    }),
  //------
});
