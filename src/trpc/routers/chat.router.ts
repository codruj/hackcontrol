import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "..";
import type { ChannelType } from "@prisma/client";

const CHANNEL_LABELS: Record<ChannelType, string> = {
  MENTORS_PARTICIPANTS: "Mentors & Participants",
  MENTORS_JUDGES: "Mentors & Judges",
  VOLUNTEERS_PARTICIPANTS: "Volunteers & Participants",
  VOLUNTEERS_ONLY: "Volunteer Team",
  TEAM_ONLY: "Team Channel",
};

function channelKey(hackathonId: string, type: ChannelType, participationId?: string | null) {
  return `${hackathonId}:${type}:${participationId ?? "global"}`;
}

async function getOrCreate(
  prisma: any,
  hackathonId: string,
  type: ChannelType,
  participationId?: string | null,
) {
  const key = channelKey(hackathonId, type, participationId);
  const existing = await prisma.chatChannel.findUnique({ where: { key } });
  if (existing) return existing;
  return prisma.chatChannel.create({
    data: {
      key,
      hackathonId,
      type,
      participationId: participationId ?? null,
      name: type === "TEAM_ONLY"
        ? "Team Channel"
        : CHANNEL_LABELS[type],
    },
  });
}

async function checkAccess(
  prisma: any,
  session: { user: { id: string; role: string; email?: string | null } },
  hackathonId: string,
  hackathonUrl: string,
  type: ChannelType,
  participationId?: string | null,
): Promise<boolean> {
  const userId = session.user.id;
  const role = session.user.role;

  if (role === "ADMIN") return true;

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { creatorId: true },
  });
  if (hackathon?.creatorId === userId) return true;

  const [mentor, judge, volunteer, participation] = await Promise.all([
    prisma.mentor.findUnique({ where: { userId_hackathonId: { userId, hackathonId } } }),
    prisma.judge.findUnique({ where: { userId_hackathonId: { userId, hackathonId } } }),
    prisma.volunteer.findUnique({ where: { userId_hackathonId: { userId, hackathonId } } }),
    prisma.participation.findFirst({ where: { creatorId: userId, hackathon_url: hackathonUrl } }),
  ]);

  switch (type) {
    case "MENTORS_PARTICIPANTS":
      return !!mentor || !!participation;
    case "MENTORS_JUDGES":
      return !!mentor || !!judge;
    case "VOLUNTEERS_PARTICIPANTS":
      return !!volunteer || !!participation;
    case "VOLUNTEERS_ONLY":
      return !!volunteer;
    case "TEAM_ONLY": {
      if (!participationId) return false;
      const teamParticipation = await prisma.participation.findUnique({
        where: { id: participationId },
        select: { creatorId: true, team_members: true },
      });
      if (!teamParticipation) return false;
      if (teamParticipation.creatorId === userId) return true;
      const email = session.user.email;
      if (email) {
        const members: { email?: string }[] = (teamParticipation.team_members as any)?.members ?? [];
        return members.some((m) => m.email === email);
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
        select: { creatorId: true, url: true },
      });
      if (!hackathon) throw new TRPCError({ code: "NOT_FOUND" });

      const isOwner = hackathon.creatorId === userId || role === "ADMIN";

      const [mentor, judge, volunteer, participation] = await Promise.all([
        ctx.prisma.mentor.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.judge.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.volunteer.findUnique({ where: { userId_hackathonId: { userId, hackathonId: input.hackathonId } } }),
        ctx.prisma.participation.findFirst({ where: { creatorId: userId, hackathon_url: hackathon.url } }),
      ]);

      const hasAnyRole = isOwner || !!mentor || !!judge || !!volunteer || !!participation;
      if (!hasAnyRole) return [];

      const typesToCreate: { type: ChannelType; participationId?: string }[] = [];

      if (isOwner || !!mentor || !!participation) typesToCreate.push({ type: "MENTORS_PARTICIPANTS" });
      if (isOwner || !!mentor || !!judge) typesToCreate.push({ type: "MENTORS_JUDGES" });
      if (isOwner || !!volunteer || !!participation) typesToCreate.push({ type: "VOLUNTEERS_PARTICIPANTS" });
      if (isOwner || !!volunteer) typesToCreate.push({ type: "VOLUNTEERS_ONLY" });
      if (participation) typesToCreate.push({ type: "TEAM_ONLY", participationId: participation.id });

      const channels = await Promise.all(
        typesToCreate.map((t) => getOrCreate(ctx.prisma, input.hackathonId, t.type, t.participationId)),
      );

      return channels;
    }),

  getMessages: protectedProcedure
    .input(z.object({ channelId: z.string(), limit: z.number().min(1).max(100).default(60) }))
    .query(async ({ ctx, input }) => {
      const channel = await ctx.prisma.chatChannel.findUnique({
        where: { id: input.channelId },
        select: { hackathonId: true, type: true, participationId: true, hackathon: { select: { url: true } } },
      });
      if (!channel) throw new TRPCError({ code: "NOT_FOUND" });

      const ok = await checkAccess(
        ctx.prisma,
        ctx.session,
        channel.hackathonId,
        channel.hackathon.url,
        channel.type,
        channel.participationId,
      );
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
        select: { hackathonId: true, type: true, participationId: true, hackathon: { select: { url: true } } },
      });
      if (!channel) throw new TRPCError({ code: "NOT_FOUND" });

      const ok = await checkAccess(
        ctx.prisma,
        ctx.session,
        channel.hackathonId,
        channel.hackathon.url,
        channel.type,
        channel.participationId,
      );
      if (!ok) throw new TRPCError({ code: "FORBIDDEN" });

      return ctx.prisma.chatMessage.create({
        data: { channelId: input.channelId, userId: ctx.session.user.id, content: input.content.trim() },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
    }),
});
