import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { updateStreak } from "@/server/services/streak";

export const streakRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });

    const streak = await updateStreak(ctx.db, userId, user.timezone);
    return streak;
  }),

  getRecentSessions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id!;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const sessions = await ctx.db.dailySession.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    return sessions;
  }),
});
