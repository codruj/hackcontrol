import { createTRPCRouter } from "@/trpc";

// Hackathon router:
import { hackathonRouter } from "./routers/hackathon.router";
import { participationRouter } from "./routers/participation.router";
import { announcementRouter } from "./routers/announcement.router";
import { judgeRouter } from "./routers/judge.router";
import { scoringRouter } from "./routers/scoring.router";
import { criteriaRouter } from "./routers/criteria.router";
import { categoryRouter } from "./routers/category.router";

export const appRouter = createTRPCRouter({
  hackathon: hackathonRouter,
  participation: participationRouter,
  announcement: announcementRouter,
  judge: judgeRouter,
  scoring: scoringRouter,
  criteria: criteriaRouter,
  category: categoryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
