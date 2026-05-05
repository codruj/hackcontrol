import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, organizerProcedure, protectedProcedure } from "..";

async function assertHackathonOwner(
  ctx: { session: { user: { id: string; role: string } }; prisma: any },
  hackathonId: string,
) {
  if (ctx.session.user.role === "ADMIN") return;
  const hackathon = await ctx.prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { creatorId: true },
  });
  if (!hackathon || hackathon.creatorId !== ctx.session.user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this hackathon" });
  }
}

export const mentorRouter = createTRPCRouter({
  addMentor: organizerProcedure
    .input(z.object({ hackathonId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertHackathonOwner(ctx as any, input.hackathonId);
      const existing = await ctx.prisma.mentor.findUnique({
        where: { userId_hackathonId: { userId: input.userId, hackathonId: input.hackathonId } },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "User is already a mentor for this hackathon" });
      return ctx.prisma.mentor.create({
        data: { userId: input.userId, hackathonId: input.hackathonId, invitedById: ctx.session.user.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    }),

  removeMentor: organizerProcedure
    .input(z.object({ hackathonId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertHackathonOwner(ctx as any, input.hackathonId);
      const mentor = await ctx.prisma.mentor.findUnique({
        where: { userId_hackathonId: { userId: input.userId, hackathonId: input.hackathonId } },
      });
      if (!mentor) throw new TRPCError({ code: "NOT_FOUND", message: "Mentor not found" });
      return ctx.prisma.mentor.delete({
        where: { userId_hackathonId: { userId: input.userId, hackathonId: input.hackathonId } },
      });
    }),

  getHackathonMentors: protectedProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.mentor.findMany({
        where: { hackathonId: input.hackathonId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          inviter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ),

  searchUsers: organizerProcedure
    .input(z.object({ query: z.string().min(1), hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.prisma.mentor.findMany({
        where: { hackathonId: input.hackathonId },
        select: { userId: true },
      });
      const excludeIds = existing.map((m: { userId: string }) => m.userId);
      return ctx.prisma.user.findMany({
        where: {
          AND: [
            { OR: [
              { name: { contains: input.query, mode: "insensitive" } },
              { email: { contains: input.query, mode: "insensitive" } },
              { username: { contains: input.query, mode: "insensitive" } },
            ]},
            { id: { notIn: excludeIds } },
          ],
        },
        select: { id: true, name: true, email: true, username: true },
        take: 10,
      });
    }),

  getMentoredHackathons: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.mentor.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        hackathon: { select: { id: true, name: true, url: true, description: true, is_finished: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ),

  updateMentorProfile: protectedProcedure
    .input(z.object({
      hackathonId: z.string(),
      bio: z.string().max(400).optional(),
      expertise: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const mentor = await ctx.prisma.mentor.findUnique({
        where: { userId_hackathonId: { userId: ctx.session.user.id, hackathonId: input.hackathonId } },
      });
      if (!mentor) throw new TRPCError({ code: "FORBIDDEN", message: "Not a mentor for this hackathon" });
      return ctx.prisma.mentor.update({
        where: { id: mentor.id },
        data: { bio: input.bio, expertise: input.expertise },
      });
    }),

  // --- Availability slots ---

  createSlot: protectedProcedure
    .input(z.object({
      hackathonId: z.string(),
      startTime: z.date(),
      endTime: z.date(),
      topic: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true },
      });
      const isOwner = hackathon?.creatorId === userId || role === "ADMIN";

      const mentor = await ctx.prisma.mentor.findUnique({
        where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } },
      });

      if (!isOwner && !mentor) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only mentors or organizers can create slots" });
      }

      const mentorId = mentor?.id;
      if (!mentorId) throw new TRPCError({ code: "BAD_REQUEST", message: "No mentor profile found. Contact the organizer." });

      if (input.startTime >= input.endTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Start time must be before end time" });
      }

      return ctx.prisma.mentorSlot.create({
        data: {
          mentorId,
          hackathonId: input.hackathonId,
          startTime: input.startTime,
          endTime: input.endTime,
          topic: input.topic,
        },
        include: { mentor: { include: { user: { select: { id: true, name: true } } } } },
      });
    }),

  updateSlot: protectedProcedure
    .input(z.object({
      slotId: z.string(),
      hackathonId: z.string(),
      startTime: z.date().optional(),
      endTime: z.date().optional(),
      topic: z.string().max(200).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      const slot = await ctx.prisma.mentorSlot.findUnique({
        where: { id: input.slotId },
        include: { mentor: { select: { userId: true } } },
      });
      if (!slot || slot.hackathonId !== input.hackathonId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });
      }
      if (slot.isBooked) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit a booked slot" });
      }

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true },
      });
      const isOwner = hackathon?.creatorId === userId || role === "ADMIN";
      const isMentorOwner = slot.mentor.userId === userId;

      if (!isOwner && !isMentorOwner) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const update: Record<string, unknown> = {};
      if (input.startTime !== undefined) update.startTime = input.startTime;
      if (input.endTime !== undefined) update.endTime = input.endTime;
      if (input.topic !== undefined) update.topic = input.topic;

      return ctx.prisma.mentorSlot.update({ where: { id: input.slotId }, data: update });
    }),

  deleteSlot: protectedProcedure
    .input(z.object({ slotId: z.string(), hackathonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      const slot = await ctx.prisma.mentorSlot.findUnique({
        where: { id: input.slotId },
        include: { mentor: { select: { userId: true } } },
      });
      if (!slot || slot.hackathonId !== input.hackathonId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });
      }

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true },
      });
      const isOwner = hackathon?.creatorId === userId || role === "ADMIN";
      const isMentorOwner = slot.mentor.userId === userId;

      if (!isOwner && !isMentorOwner) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.mentorSlot.delete({ where: { id: input.slotId } });
    }),

  getSlots: protectedProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true, url: true },
      });
      if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = hackathon.creatorId === userId || role === "ADMIN";

      const [mentorRecord, volunteerRecord, judgeRecord, participation] = await Promise.all([
        ctx.prisma.mentor.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.volunteer.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.judge.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.participation.findFirst({ where: { creatorId: userId, hackathon_url: hackathon.url } }),
      ]);

      const hasAccess = isOwner || !!mentorRecord || !!volunteerRecord || !!judgeRecord || !!participation;
      if (!hasAccess) throw new TRPCError({ code: "FORBIDDEN" });

      const slots = await ctx.prisma.mentorSlot.findMany({
        where: { hackathonId: input.hackathonId },
        include: {
          mentor: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
          bookedBy: isOwner || !!mentorRecord
            ? { select: { id: true, name: true, email: true } }
            : undefined,
        },
        orderBy: { startTime: "asc" },
      });

      return slots.map((slot) => ({
        ...slot,
        bookedBy: isOwner || slot.mentor.userId === userId || slot.bookedById === userId
          ? slot.bookedBy
          : slot.isBooked ? { id: "", name: "Booked", email: "" } : null,
      }));
    }),

  bookSlot: protectedProcedure
    .input(z.object({
      slotId: z.string(),
      hackathonId: z.string(),
      bookingNote: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { url: true },
      });
      if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });

      const participation = await ctx.prisma.participation.findFirst({
        where: { creatorId: userId, hackathon_url: hackathon.url },
      });
      if (!participation) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be a participant to book a mentor slot" });
      }

      const slot = await ctx.prisma.mentorSlot.findUnique({ where: { id: input.slotId } });
      if (!slot || slot.hackathonId !== input.hackathonId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });
      }
      if (slot.isBooked) {
        throw new TRPCError({ code: "CONFLICT", message: "This slot is already booked" });
      }

      return ctx.prisma.mentorSlot.update({
        where: { id: input.slotId },
        data: { isBooked: true, bookedById: userId, bookingNote: input.bookingNote },
      });
    }),

  cancelBooking: protectedProcedure
    .input(z.object({ slotId: z.string(), hackathonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      const slot = await ctx.prisma.mentorSlot.findUnique({
        where: { id: input.slotId },
        include: { mentor: { select: { userId: true } } },
      });
      if (!slot || slot.hackathonId !== input.hackathonId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true },
      });
      const isOwner = hackathon?.creatorId === userId || role === "ADMIN";
      const isMentorOwner = slot.mentor.userId === userId;
      const isBooker = slot.bookedById === userId;

      if (!isOwner && !isMentorOwner && !isBooker) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.prisma.mentorSlot.update({
        where: { id: input.slotId },
        data: { isBooked: false, bookedById: null, bookingNote: null },
      });
    }),
});
