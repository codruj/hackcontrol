import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "..";
import type { ChannelType } from "@prisma/client";

function channelKey(hackathonId: string, type: ChannelType, suffix?: string | null) {
  return `${hackathonId}:${type}:${suffix ?? "global"}`;
}

async function getOrCreateGeneral(prisma: any, hackathonId: string, type: ChannelType, label: string) {
  const key = channelKey(hackathonId, type);
  const existing = await prisma.chatChannel.findUnique({ where: { key } });
  if (existing) return existing;
  return prisma.chatChannel.create({ data: { key, hackathonId, type, name: label } });
}

async function checkAccess(
  prisma: any,
  session: { user: { id: string; role: string; email?: string | null } },
  hackathonId: string,
  channel: { type: ChannelType; teamId: string | null; slotId: string | null },
): Promise<boolean> {
  const userId = session.user.id;
  const role = session.user.role;

  if (role === "ADMIN") return true;

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { creatorId: true },
  });
  if (hackathon?.creatorId === userId) return true;

  const [mentor, judge, volunteer, enrollment] = await Promise.all([
    prisma.mentor.findUnique({ where: { userId_hackathonId: { userId, hackathonId } } }),
    prisma.judge.findUnique({ where: { userId_hackathonId: { userId, hackathonId } } }),
    prisma.volunteer.findUnique({ where: { userId_hackathonId: { userId, hackathonId } } }),
    prisma.hackathonEnrollment.findUnique({ where: { userId_hackathonId: { userId, hackathonId } } }),
  ]);

  const isEnrolled = !!enrollment || !!mentor || !!judge || !!volunteer;

  switch (channel.type) {
    case "MENTORS_PARTICIPANTS":
    case "VOLUNTEERS_PARTICIPANTS":
      return isEnrolled;
    case "MENTORS_JUDGES":
      return !!mentor || !!judge;
    case "VOLUNTEERS_ONLY":
      return !!volunteer;
    case "TEAM_ONLY": {
      if (!channel.teamId) return false;
      const membership = await prisma.teamMembership.findFirst({
        where: { teamId: channel.teamId, userId },
      });
      return !!membership;
    }
    case "TEAM_MENTOR": {
      if (!channel.teamId) return false;
      const membership = await prisma.teamMembership.findFirst({
        where: { teamId: channel.teamId, userId },
      });
      if (membership) return true;
      // Mentor who owns the booked slot
      if (channel.slotId) {
        const slot = await prisma.mentorSlot.findUnique({
          where: { id: channel.slotId },
          include: { mentor: { select: { userId: true } } },
        });
        return slot?.mentor.userId === userId;
      }
      return false;
    }
    default:
      return false;
  }
}

export const chatRouter = createTRPCRouter({
  getMyChannels: protectedProcedure
    .input(z.object({ hackathonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;

      const hackathon = await ctx.prisma.hackathon.findUnique({
        where: { id: input.hackathonId },
        select: { creatorId: true },
      });
      if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = hackathon.creatorId === userId || role === "ADMIN";

      const [mentor, judge, volunteer, enrollment, teamMemberships] = await Promise.all([
        ctx.prisma.mentor.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.judge.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.volunteer.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.hackathonEnrollment.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.teamMembership.findMany({
          where: { userId, team: { hackathonId: input.hackathonId } },
          select: { teamId: true },
        }),
      ]);

      const isEnrolled = isOwner || !!enrollment || !!mentor || !!judge || !!volunteer;
      if (!isEnrolled) return [];

      // General channels (lazy-created)
      const generalChannels = await Promise.all([
        getOrCreateGeneral(ctx.prisma, input.hackathonId, "MENTORS_PARTICIPANTS", "Mentors & Participants"),
        getOrCreateGeneral(ctx.prisma, input.hackathonId, "VOLUNTEERS_PARTICIPANTS", "Volunteers & Participants"),
        ...(isOwner || !!mentor || !!judge
          ? [getOrCreateGeneral(ctx.prisma, input.hackathonId, "MENTORS_JUDGES", "Mentors & Judges")]
          : []),
        ...(isOwner || !!volunteer
          ? [getOrCreateGeneral(ctx.prisma, input.hackathonId, "VOLUNTEERS_ONLY", "Volunteer Team")]
          : []),
      ]);

      // Team-specific channels (pre-created at registration/booking time)
      const teamIds = teamMemberships.map((m) => m.teamId);
      let teamChannels: any[] = [];

      if (isOwner) {
        teamChannels = await ctx.prisma.chatChannel.findMany({
          where: { hackathonId: input.hackathonId, type: { in: ["TEAM_ONLY", "TEAM_MENTOR"] } },
        });
      } else if (teamIds.length > 0) {
        teamChannels = await ctx.prisma.chatChannel.findMany({
          where: { hackathonId: input.hackathonId, teamId: { in: teamIds } },
        });
      }

      // Mentors see TEAM_MENTOR channels where they are the booked mentor
      if (!!mentor && !isOwner) {
        const mentorSlots = await ctx.prisma.mentorSlot.findMany({
          where: { mentor: { userId }, hackathonId: input.hackathonId, isBooked: true },
          select: { id: true },
        });
        const slotIds = mentorSlots.map((s: { id: string }) => s.id);
        if (slotIds.length > 0) {
          const mentorTeamChannels = await ctx.prisma.chatChannel.findMany({
            where: { hackathonId: input.hackathonId, type: "TEAM_MENTOR", slotId: { in: slotIds } },
          });
          const existingIds = new Set(teamChannels.map((c: any) => c.id));
          teamChannels = [...teamChannels, ...mentorTeamChannels.filter((c: any) => !existingIds.has(c.id))];
        }
      }

      return [...generalChannels, ...teamChannels];
    }),

  getMessages: protectedProcedure
    .input(z.object({ channelId: z.string(), limit: z.number().min(1).max(100).default(60) }))
    .query(async ({ ctx, input }) => {
      const channel = await ctx.prisma.chatChannel.findUnique({
        where: { id: input.channelId },
        select: { hackathonId: true, type: true, teamId: true, slotId: true },
      });
      if (!channel) throw new TRPCError({ code: "NOT_FOUND" });

      const ok = await checkAccess(ctx.prisma, ctx.session, channel.hackathonId, channel);
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.prisma.chatMessage.findMany({
        where: { channelId: input.channelId },
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
        take: input.limit,
      });
    }),

  sendMessage: protectedProcedure
    .input(z.object({ channelId: z.string(), content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const channel = await ctx.prisma.chatChannel.findUnique({
        where: { id: input.channelId },
        select: { hackathonId: true, type: true, teamId: true, slotId: true },
      });
      if (!channel) throw new TRPCError({ code: "NOT_FOUND" });

      const ok = await checkAccess(ctx.prisma, ctx.session, channel.hackathonId, channel);
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.prisma.chatMessage.create({
        data: { channelId: input.channelId, userId: ctx.session.user.id, content: input.content.trim() },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),
});
