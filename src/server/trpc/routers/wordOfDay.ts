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
      // Pick a word: high frequency, not recently used as WOTD
      const recentWordIds = (
        await ctx.db.wordOfDay.findMany({
          orderBy: { date: "desc" },
          take: 30,
          select: { wordId: true },
        })
      ).map((w) => w.wordId);

      const word = await ctx.db.word.findFirst({
        where: {
          id: { notIn: recentWordIds },
          phonetic: { not: null }, // prefer words with phonetic
          definitionEn: { not: "" },
        },
        orderBy: { frequency: "asc" },
      });

      if (!word) return null;

      wotd = await ctx.db.wordOfDay.create({
        data: { wordId: word.id, date: today },
        include: { word: { include: { topic: true } } },
      });
    }

    return wotd;
  }),
});
