import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, organizerProcedure, adminProcedure } from "..";

function betterName(a: string, b: string): string {
  const score = (s: string) => {
    const hasMixed = /[A-Z]/.test(s) && /[a-z]/.test(s);
    const startsUpper = /^[A-Z]/.test(s);
    if (hasMixed && startsUpper) return 2;
    if (hasMixed) return 1;
    return 0;
  };
  return score(b) > score(a) ? b : a;
}

export const sponsorRouter = createTRPCRouter({
  getPublicSponsors: publicProcedure.query(async ({ ctx }) => {
    const [hackathons, mentors, judges] = await Promise.all([
      ctx.prisma.hackathon.findMany({
        where: { verified: true },
        select: { sponsors: true },
      }),
      ctx.prisma.mentor.findMany({ select: { company: true } }),
      ctx.prisma.judge.findMany({ select: { company: true } }),
    ]);

    const groups = new Map<string, string>();

    const add = (raw: unknown) => {
      if (!raw || typeof raw !== "string") return;
      const name = raw.trim();
      if (!name) return;
      const key = name.toLowerCase();
      groups.set(key, groups.has(key) ? betterName(groups.get(key)!, name) : name);
    };

    for (const h of hackathons) {
      if (Array.isArray(h.sponsors)) {
        for (const s of h.sponsors as Record<string, unknown>[]) add(s?.name);
      }
    }
    for (const m of mentors) add(m.company);
    for (const j of judges) add(j.company);

    return Array.from(groups.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }),

  submitSponsorInterest: publicProcedure
    .input(
      z.object({
        companyName: z.string().trim().min(1, "Company name is required").max(200),
        contact: z.string().trim().min(1, "Email or phone is required").max(200),
        description: z.string().trim().min(1, "Description is required").max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.sponsorRegistration.create({
        data: {
          companyName: input.companyName,
          contact: input.contact,
          description: input.description,
        },
      });
    }),

  getSponsorRegistrations: organizerProcedure.query(async ({ ctx }) => {
    return ctx.prisma.sponsorRegistration.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),

  deleteSponsorRegistration: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const registration = await ctx.prisma.sponsorRegistration.findUnique({
        where: { id: input.id },
      });
      if (!registration) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sponsor registration not found" });
      }
      return ctx.prisma.sponsorRegistration.delete({ where: { id: input.id } });
    }),
});
