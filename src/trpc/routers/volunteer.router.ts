import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  organizerProcedure,
  protectedProcedure,
} from "..";

const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

export const volunteerRouter = createTRPCRouter({
  addVolunteer: organizerProcedure
    .input(z.object({ hackathonId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { hackathonId, userId } = input;
      const inviterId = ctx.session.user.id;

      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });
        if (!hackathon || hackathon.creatorId !== inviterId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this hackathon" });
        }
      }

      const existing = await ctx.prisma.volunteer.findUnique({
        where: { userId_hackathonId: { userId, hackathonId } },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a volunteer for this hackathon" });
      }

      return ctx.prisma.volunteer.create({
        data: { userId, hackathonId, invitedById: inviterId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  removeVolunteer: organizerProcedure
    .input(z.object({ hackathonId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { hackathonId, userId } = input;
      const requesterId = ctx.session.user.id;

      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });
        if (!hackathon || hackathon.creatorId !== requesterId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this hackathon" });
        }
      }

      const volunteer = await ctx.prisma.volunteer.findUnique({
        where: { userId_hackathonId: { userId, hackathonId } },
      });
      if (!volunteer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Volunteer not found" });
      }

      return ctx.prisma.volunteer.delete({
        where: { userId_hackathonId: { userId, hackathonId } },
      });
    }),

  getHackathonVolunteers: protectedProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.volunteer.findMany({
        where: { hackathonId: input.hackathonId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          inviter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  searchUsers: organizerProcedure
    .input(z.object({ query: z.string().min(1), hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existingVolunteers = await ctx.prisma.volunteer.findMany({
        where: { hackathonId: input.hackathonId },
        select: { userId: true },
      });
      const excludeIds = existingVolunteers.map((v) => v.userId);

      return ctx.prisma.user.findMany({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: input.query, mode: "insensitive" } },
                { email: { contains: input.query, mode: "insensitive" } },
                { username: { contains: input.query, mode: "insensitive" } },
              ],
            },
            { id: { notIn: excludeIds } },
          ],
        },
        select: { id: true, name: true, email: true, username: true },
        take: 10,
      });
    }),

  getVolunteeredHackathons: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.volunteer.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        hackathon: {
          select: { id: true, name: true, url: true, description: true, is_finished: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  createTask: organizerProcedure
    .input(
      z.object({
        hackathonId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        deadline: z.date().optional(),
        status: taskStatusSchema.default("TODO"),
        volunteerIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { hackathonId, volunteerIds, ...taskData } = input;
      const createdById = ctx.session.user.id;

      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });
        if (!hackathon || hackathon.creatorId !== createdById) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this hackathon" });
        }
      }

      const task = await ctx.prisma.volunteerTask.create({
        data: {
          ...taskData,
          hackathonId,
          createdById,
        },
      });

      if (volunteerIds && volunteerIds.length > 0) {
        const volunteers = await ctx.prisma.volunteer.findMany({
          where: { id: { in: volunteerIds }, hackathonId },
          select: { id: true },
        });
        await ctx.prisma.volunteerTaskAssignment.createMany({
          data: volunteers.map((v) => ({ taskId: task.id, volunteerId: v.id })),
          skipDuplicates: true,
        });
      }

      return ctx.prisma.volunteerTask.findUnique({
        where: { id: task.id },
        include: {
          assignees: {
            include: {
              volunteer: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });
    }),

  updateTask: organizerProcedure
    .input(
      z.object({
        taskId: z.string(),
        hackathonId: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        deadline: z.date().nullable().optional(),
        status: taskStatusSchema.optional(),
        volunteerIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, hackathonId, volunteerIds, ...updateData } = input;
      const requesterId = ctx.session.user.id;

      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });
        if (!hackathon || hackathon.creatorId !== requesterId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this hackathon" });
        }
      }

      const task = await ctx.prisma.volunteerTask.findUnique({
        where: { id: taskId },
        select: { hackathonId: true },
      });
      if (!task || task.hackathonId !== hackathonId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }

      const filteredUpdate: Record<string, unknown> = {};
      if (updateData.title !== undefined) filteredUpdate.title = updateData.title;
      if (updateData.description !== undefined) filteredUpdate.description = updateData.description;
      if (updateData.deadline !== undefined) filteredUpdate.deadline = updateData.deadline;
      if (updateData.status !== undefined) filteredUpdate.status = updateData.status;

      await ctx.prisma.volunteerTask.update({
        where: { id: taskId },
        data: filteredUpdate,
      });

      if (volunteerIds !== undefined) {
        await ctx.prisma.volunteerTaskAssignment.deleteMany({ where: { taskId } });

        if (volunteerIds.length > 0) {
          const volunteers = await ctx.prisma.volunteer.findMany({
            where: { id: { in: volunteerIds }, hackathonId },
            select: { id: true },
          });
          await ctx.prisma.volunteerTaskAssignment.createMany({
            data: volunteers.map((v) => ({ taskId, volunteerId: v.id })),
            skipDuplicates: true,
          });
        }
      }

      return ctx.prisma.volunteerTask.findUnique({
        where: { id: taskId },
        include: {
          assignees: {
            include: {
              volunteer: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
      });
    }),

  deleteTask: organizerProcedure
    .input(z.object({ taskId: z.string(), hackathonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { taskId, hackathonId } = input;
      const requesterId = ctx.session.user.id;

      if (ctx.session.user.role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });
        if (!hackathon || hackathon.creatorId !== requesterId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this hackathon" });
        }
      }

      return ctx.prisma.volunteerTask.delete({ where: { id: taskId } });
    }),

  getTasks: protectedProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      if (role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: input.hackathonId },
          select: { creatorId: true },
        });
        const isOwner = hackathon?.creatorId === userId;

        if (!isOwner) {
          const volunteer = await ctx.prisma.volunteer.findUnique({
            where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } },
          });
          if (!volunteer) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Not a volunteer for this hackathon" });
          }
        }
      }

      return ctx.prisma.volunteerTask.findMany({
        where: { hackathonId: input.hackathonId },
        include: {
          assignees: {
            include: {
              volunteer: { include: { user: { select: { id: true, name: true, email: true } } } },
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  updateTaskStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        hackathonId: z.string(),
        status: taskStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { taskId, hackathonId, status } = input;
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      if (role !== "ADMIN") {
        const hackathon = await ctx.prisma.hackathon.findUnique({
          where: { id: hackathonId },
          select: { creatorId: true },
        });
        const isOwner = hackathon?.creatorId === userId;

        if (!isOwner) {
          const volunteer = await ctx.prisma.volunteer.findUnique({
            where: { userId_hackathonId: { userId, hackathonId } },
          });
          if (!volunteer) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
          }

          const assignment = await ctx.prisma.volunteerTaskAssignment.findUnique({
            where: { taskId_volunteerId: { taskId, volunteerId: volunteer.id } },
          });
          if (!assignment) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Not assigned to this task" });
          }
        }
      }

      return ctx.prisma.volunteerTask.update({
        where: { id: taskId },
        data: { status },
      });
    }),
});
