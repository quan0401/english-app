import { createTRPCRouter, publicProcedure } from "@/server/trpc/init";

export const wordOfDayRouter = createTRPCRouter({
  getToday: publicProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already picked for today
    let wotd = await ctx.db.wordOfDay.findUnique({
      where: { date: today },
      include: { word: { include: { topic: true } } },
    });

    if (!wotd) {
      const recentWordIds = (
        await ctx.db.wordOfDay.findMany({
          orderBy: { date: "desc" },
          take: 60,
          select: { wordId: true },
        })
      ).map((w) => w.wordId);

      // Pick an interesting word: B1-B2 level, not too common, not too rare
      const candidates = await ctx.db.word.findMany({
        where: {
          id: { notIn: recentWordIds },
          needsCrawl: false,
          definitionEn: { not: "[pending]" },
          translationVi: { not: "[pending]" },
          phonetic: { not: null },
          cefrLevel: { in: ["B1", "B2"] },
          frequency: { gte: 500, lte: 5000 },
        },
        take: 50,
        orderBy: { frequency: "asc" },
      });

      if (candidates.length === 0) return null;

      // Pick randomly from candidates
      const word = candidates[Math.floor(Math.random() * candidates.length)];

      wotd = await ctx.db.wordOfDay.create({
        data: { wordId: word.id, date: today },
        include: { word: { include: { topic: true } } },
      });
    }

    return wotd;
  }),
});
