import { createTRPCRouter } from "@/trpc";

// Hackathon router:
import { hackathonRouter } from "./routers/hackathon.router";
import { participationRouter } from "./routers/participation.router";
import { announcementRouter } from "./routers/announcement.router";
import { judgeRouter } from "./routers/judge.router";
import { scoringRouter } from "./routers/scoring.router";
import { criteriaRouter } from "./routers/criteria.router";
import { categoryRouter } from "./routers/category.router";
import { volunteerRouter } from "./routers/volunteer.router";
import { mentorRouter } from "./routers/mentor.router";
import { chatRouter } from "./routers/chat.router";

export const appRouter = createTRPCRouter({
  hackathon: hackathonRouter,
  participation: participationRouter,
  announcement: announcementRouter,
  judge: judgeRouter,
  scoring: scoringRouter,
  criteria: criteriaRouter,
  category: categoryRouter,
  volunteer: volunteerRouter,
  mentor: mentorRouter,
  chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
