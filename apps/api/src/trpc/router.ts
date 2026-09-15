import { historyRouter } from "./routers/history.ts";
import { logRouter } from "./routers/log.ts";
import { projectRouter } from "./routers/project.ts";
import { subjectRouter } from "./routers/subject.ts";
import { userRouter } from "./routers/user.ts";
import { router } from "./trpc.ts";

export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  subject: subjectRouter,
  log: logRouter,
  history: historyRouter,
});

export type AppRouter = typeof appRouter;
