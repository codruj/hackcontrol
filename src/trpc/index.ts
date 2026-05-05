/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CreateContextOptions = {
  session: Session | null;
};

/**
 * This helper generates the "internals" for a tRPC context. If you need to use it, you can export
 * it from here.
 *
 * Examples of things you may need it for:
 * - testing, so we don't have to mock Next.js' req/res
 * - tRPC's `createSSGHelpers`, where we don't have req/res
 *
 * @see https://create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma,
  };
};

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  // Get the session from the server using the getServerSession wrapper function
  const session = await getServerAuthSession({ req, res });

  return createInnerTRPCContext({
    session,
  });
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure;

/** Reusable middleware that enforces users are logged in before running the procedure. */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

/** Reusable middleware that enforces users are logged in and have ADMIN role. */
const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Admin-only procedure
 *
 * If you want a query or mutation to ONLY be accessible to admin users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null and has ADMIN role.
 */
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);

/** Reusable middleware that enforces users are logged in and have ADMIN or ORGANIZER role. */
const enforceUserIsOrganizer = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "ADMIN" && ctx.session.user.role !== "ORGANIZER") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Organizer procedure (ADMIN or ORGANIZER roles)
 *
 * If you want a query or mutation to be accessible to organizers and admins, use this.
 */
export const organizerProcedure = t.procedure.use(enforceUserIsOrganizer);

/** Reusable middleware that enforces user can judge specific hackathon. */
const enforceUserCanJudgeHackathon = t.middleware(async ({ ctx, next, input }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const hackathonId = (input as any)?.hackathonId;
  if (!hackathonId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "hackathonId required" });
  }

  const userId = ctx.session.user.id;
  
  if (ctx.session.user.role === "ADMIN") {
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  }

  const isJudge = await ctx.prisma.judge.findUnique({
    where: {
      userId_hackathonId: {
        userId,
        hackathonId,
      },
    },
  });

  if (!isJudge) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to judge this hackathon" });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Judge procedure (for judging specific hackathons)
 *
 * Enforces that user can judge the hackathon specified in input.hackathonId
 */
export const judgeProcedure = t.procedure.use(enforceUserCanJudgeHackathon);

/** Reusable middleware that enforces user can manage specific hackathon. */
const enforceUserCanManageHackathon = t.middleware(async ({ ctx, next, input }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const hackathonId = (input as any)?.hackathonId;
  if (!hackathonId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "hackathonId required" });
  }

  const userId = ctx.session.user.id;
  
  if (ctx.session.user.role === "ADMIN") {
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  }

  const hackathon = await ctx.prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { creatorId: true },
  });

  if (!hackathon || hackathon.creatorId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to manage this hackathon" });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Hackathon management procedure
 *
 * Enforces that user can manage the hackathon specified in input.hackathonId
 */
export const hackathonManagerProcedure = t.procedure.use(enforceUserCanManageHackathon);

/** Reusable middleware that enforces user can access volunteer data for specific hackathon. */
const enforceUserCanAccessVolunteerData = t.middleware(async ({ ctx, next, input }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const hackathonId = (input as any)?.hackathonId;
  if (!hackathonId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "hackathonId required" });
  }

  const userId = ctx.session.user.id;

  if (ctx.session.user.role === "ADMIN") {
    return next({ ctx: { session: { ...ctx.session, user: ctx.session.user } } });
  }

  if (ctx.session.user.role === "ORGANIZER") {
    const hackathon = await ctx.prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { creatorId: true },
    });
    if (hackathon?.creatorId === userId) {
      return next({ ctx: { session: { ...ctx.session, user: ctx.session.user } } });
    }
  }

  const isVolunteer = await ctx.prisma.volunteer.findUnique({
    where: { userId_hackathonId: { userId, hackathonId } },
  });

  if (!isVolunteer) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this hackathon's volunteer data" });
  }

  return next({ ctx: { session: { ...ctx.session, user: ctx.session.user } } });
});

/**
 * Volunteer procedure
 *
 * Allows access to admins, hackathon owners, and volunteers assigned to the hackathon.
 */
export const volunteerProcedure = t.procedure.use(enforceUserCanAccessVolunteerData);
