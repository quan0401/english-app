import { createTRPCRouter } from "@/server/trpc/init";
import { wordRouter } from "@/server/trpc/routers/word";
import { sessionRouter } from "@/server/trpc/routers/session";
import { progressRouter } from "@/server/trpc/routers/progress";
import { streakRouter } from "@/server/trpc/routers/streak";
import { userRouter } from "@/server/trpc/routers/user";
import { favoritesRouter } from "@/server/trpc/routers/favorites";
import { wordListsRouter } from "@/server/trpc/routers/wordLists";
import { gameRouter } from "@/server/trpc/routers/game";
import { wordOfDayRouter } from "@/server/trpc/routers/wordOfDay";

export const appRouter = createTRPCRouter({
  word: wordRouter,
  session: sessionRouter,
  progress: progressRouter,
  streak: streakRouter,
  user: userRouter,
  favorites: favoritesRouter,
  wordLists: wordListsRouter,
  game: gameRouter,
  wordOfDay: wordOfDayRouter,
});

export type AppRouter = typeof appRouter;
