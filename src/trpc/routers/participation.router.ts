import {
  newParticipationSchema,
  participationSchema,
  updateParticipationSchema,
} from "@/schema/participation";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
  // Update team members =>
  updateTeamMembers: protectedProcedure
    .input(
      z.object({
        participationId: z.string(),
        teamName: z.string().max(100).optional(),
        members: z
          .array(
            z.object({
              name: z.string().min(1).max(100),
              email: z.string().max(200),
              role: z.string().max(100).optional(),
            }),
          )
          .max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const participation = await ctx.prisma.participation.findUnique({
        where: { id: input.participationId },
        include: { hackathon: { select: { is_finished: true } } },
      });

      if (!participation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Participation not found" });
      }

      if (participation.creatorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (participation.hackathon?.is_finished) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update team after the hackathon has ended",
        });
      }

      const teamData =
        input.members.length > 0
          ? { team_name: input.teamName ?? null, members: input.members }
          : null;

      return ctx.prisma.participation.update({
        where: { id: input.participationId },
        data: { team_members: teamData as any },
      });
    }),
  //------
  // Edit own submission =>
  editSubmission: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(50),
        description: z.string().min(1).max(300),
        project_url: z.string().url(),
        presentation_url: z.string().url().optional().or(z.literal("")),
        team_members: z
          .object({
            team_name: z.string().optional(),
            members: z.array(
              z.object({
                name: z.string().min(1),
                email: z.string().email(),
                role: z.string().optional(),
              }),
            ),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const participation = await ctx.prisma.participation.findUnique({
        where: { id: input.id },
        include: { hackathon: { select: { is_finished: true } } },
      });

      if (!participation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      if (participation.creatorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own submission" });
      }

      if (participation.hackathon?.is_finished) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Submissions cannot be edited after the hackathon has ended" });
      }

      return ctx.prisma.participation.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          project_url: input.project_url,
          presentation_url: input.presentation_url || null,
          team_members: (input.team_members ?? null) as any,
        },
      });
    }),
  //------
  // Delete own submission =>
  deleteSubmission: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const participation = await ctx.prisma.participation.findUnique({
        where: { id: input.id },
        include: { hackathon: { select: { is_finished: true } } },
      });

      if (!participation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      if (participation.creatorId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own submission" });
      }

      if (participation.hackathon?.is_finished) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Submissions cannot be deleted after the hackathon has ended" });
      }

      await ctx.prisma.participation.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  //------
});
