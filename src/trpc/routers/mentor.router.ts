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
    .input(z.object({ hackathonId: z.string(), userId: z.string(), company: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertHackathonOwner(ctx as any, input.hackathonId);
      const existing = await ctx.prisma.mentor.findUnique({
        where: { userId_hackathonId: { userId: input.userId, hackathonId: input.hackathonId } },
      });
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "User is already a mentor for this hackathon" });
      return ctx.prisma.mentor.create({
        data: { userId: input.userId, hackathonId: input.hackathonId, invitedById: ctx.session.user.id, company: input.company ?? null },
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
      mentorUserId: z.string().optional(),
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

      let mentor;
      if (isOwner && input.mentorUserId) {
        mentor = await ctx.prisma.mentor.findUnique({
          where: { userId_hackathonId: { userId: input.mentorUserId, hackathonId: input.hackathonId } },
        });
        if (!mentor) throw new TRPCError({ code: "NOT_FOUND", message: "Mentor not found for this hackathon" });
      } else {
        mentor = await ctx.prisma.mentor.findUnique({
          where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } },
        });
        if (!isOwner && !mentor) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only mentors or organizers can create slots" });
        }
        if (!mentor) throw new TRPCError({ code: "BAD_REQUEST", message: "No mentor profile found. Contact the organizer." });
      }

      if (input.startTime >= input.endTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Start time must be before end time" });
      }

      return ctx.prisma.mentorSlot.create({
        data: {
          mentorId: mentor.id,
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

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true },
      });
      const isOwner = hackathon?.creatorId === userId || role === "ADMIN";
      const isMentorOwner = slot.mentor.userId === userId;

      if (!isOwner && !isMentorOwner) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (slot.isBooked && !isOwner) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot edit a booked slot" });
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

      const [mentorRecord, enrollment] = await Promise.all([
        ctx.prisma.mentor.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.hackathonEnrollment.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
      ]);

      const canSeeFullBookingDetails = isOwner || !!mentorRecord;

      const slots = await ctx.prisma.mentorSlot.findMany({
        where: { hackathonId: input.hackathonId },
        include: {
          mentor: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
          bookedBy: canSeeFullBookingDetails
            ? { select: { id: true, name: true, email: true } }
            : undefined,
        },
        orderBy: { startTime: "asc" },
      });

      return slots.map((slot) => ({
        ...slot,
        bookedBy: canSeeFullBookingDetails || slot.bookedById === userId
          ? slot.bookedBy
          : slot.isBooked ? { id: "", name: "Booked", email: "" } : null,
        canBook: !!enrollment && !slot.isBooked,
      }));
    }),

  bookSlot: protectedProcedure
    .input(z.object({
      slotId: z.string(),
      hackathonId: z.string(),
      bookingTeamName: z.string().max(100).optional(),
      bookingPurpose: z.string().max(300).optional(),
      bookingNote: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const enrollment = await ctx.prisma.hackathonEnrollment.findUnique({
        where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } },
      });
      if (!enrollment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You must be enrolled in this hackathon to book a mentor slot" });
      }

      const slot = await ctx.prisma.mentorSlot.findUnique({ where: { id: input.slotId } });
      if (!slot || slot.hackathonId !== input.hackathonId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });
      }
      if (slot.isBooked) {
        throw new TRPCError({ code: "CONFLICT", message: "This slot is already booked" });
      }

      // Auto-detect the user's team for this hackathon
      const teamMembership = await ctx.prisma.teamMembership.findFirst({
        where: { userId, team: { hackathonId: input.hackathonId } },
        include: { team: true },
      });
      const teamId = teamMembership?.teamId ?? null;

      // Atomic conditional update — only succeeds if the slot is still unbooked,
      // preventing double bookings from concurrent requests
      const claimed = await ctx.prisma.mentorSlot.updateMany({
        where: { id: input.slotId, isBooked: false },
        data: {
          isBooked: true,
          bookedById: userId,
          bookedByTeamId: teamId,
          bookingTeamName: teamMembership?.team.name ?? input.bookingTeamName ?? null,
          bookingPurpose: input.bookingPurpose ?? null,
          bookingNote: input.bookingNote ?? null,
        },
      });

      if (claimed.count === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "This slot was just booked by someone else" });
      }

      const updatedSlot = await ctx.prisma.mentorSlot.findUnique({ where: { id: input.slotId } });

      // Create a TEAM_MENTOR channel if the user is on a team
      if (teamId) {
        const key = `${input.hackathonId}:TEAM_MENTOR:${input.slotId}`;
        const slot = await ctx.prisma.mentorSlot.findUnique({
          where: { id: input.slotId },
          include: { mentor: { include: { user: { select: { name: true } } } } },
        });
        const mentorName = slot?.mentor.user.name ?? "Mentor";
        await ctx.prisma.chatChannel.upsert({
          where: { key },
          create: {
            key,
            hackathonId: input.hackathonId,
            type: "TEAM_MENTOR",
            teamId,
            slotId: input.slotId,
            name: `${teamMembership!.team.name} + ${mentorName}`,
          },
          update: {},
        });
      }

      return updatedSlot;
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
        data: { isBooked: false, bookedById: null, bookedByTeamId: null, bookingTeamName: null, bookingPurpose: null, bookingNote: null },
      });
    }),

  generateSlots: protectedProcedure
    .input(z.object({
      hackathonId: z.string(),
      mentorUserId: z.string().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      slotDurationMinutes: z.number().int().min(5).max(480),
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

      let mentor;
      if (isOwner && input.mentorUserId) {
        mentor = await ctx.prisma.mentor.findUnique({
          where: { userId_hackathonId: { userId: input.mentorUserId, hackathonId: input.hackathonId } },
        });
        if (!mentor) throw new TRPCError({ code: "NOT_FOUND", message: "Mentor not found for this hackathon" });
      } else {
        mentor = await ctx.prisma.mentor.findUnique({
          where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } },
        });
        if (!isOwner && !mentor) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only mentors or organizers can generate slots" });
        }
        if (!mentor) throw new TRPCError({ code: "BAD_REQUEST", message: "No mentor profile found. Contact the organizer." });
      }

      const intervalStart = new Date(`${input.date}T${input.startTime}:00`);
      const intervalEnd = new Date(`${input.date}T${input.endTime}:00`);

      if (isNaN(intervalStart.getTime()) || isNaN(intervalEnd.getTime())) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date or time" });
      }
      if (intervalStart >= intervalEnd) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Start time must be before end time" });
      }

      const durationMs = input.slotDurationMinutes * 60 * 1000;
      const candidates: Array<{ startTime: Date; endTime: Date }> = [];
      let cursor = intervalStart.getTime();
      while (cursor + durationMs <= intervalEnd.getTime()) {
        candidates.push({ startTime: new Date(cursor), endTime: new Date(cursor + durationMs) });
        cursor += durationMs;
      }

      if (candidates.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The interval is shorter than the selected slot duration" });
      }

      const dayStart = new Date(`${input.date}T00:00:00`);
      const dayEnd = new Date(`${input.date}T23:59:59`);
      const existing = await ctx.prisma.mentorSlot.findMany({
        where: { mentorId: mentor.id, startTime: { gte: dayStart, lte: dayEnd } },
        select: { startTime: true, endTime: true },
      });

      const toCreate: Array<{ startTime: Date; endTime: Date }> = [];
      let skipped = 0;
      for (const c of candidates) {
        const overlaps = existing.some(
          (ex) => c.startTime < new Date(ex.endTime) && c.endTime > new Date(ex.startTime),
        );
        if (overlaps) {
          skipped++;
        } else {
          toCreate.push(c);
        }
      }

      if (toCreate.length > 0) {
        await ctx.prisma.mentorSlot.createMany({
          data: toCreate.map((s) => ({
            mentorId: mentor!.id,
            hackathonId: input.hackathonId,
            startTime: s.startTime,
            endTime: s.endTime,
            topic: input.topic ?? null,
          })),
        });
      }

      return { created: toCreate.length, skipped, total: candidates.length };
    }),
});
