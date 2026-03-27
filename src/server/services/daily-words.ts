import type { PrismaClient } from "@/generated/prisma/client";
import type { CefrLevel } from "@/generated/prisma/enums";

export async function getDailyWords(
  db: PrismaClient,
  userId: string,
  cefrLevel: CefrLevel,
  count: number = 10
) {
  // Get words at the user's level that they haven't seen yet
  const words = await db.word.findMany({
    where: {
      cefrLevel,
      userProgress: {
        none: { userId },
      },
    },
    orderBy: { frequency: "asc" },
    take: count,
  });

  // If not enough words at current level, try the next level down
  if (words.length < count) {
    const levelOrder: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];
    const currentIdx = levelOrder.indexOf(cefrLevel);

    for (let i = currentIdx - 1; i >= 0 && words.length < count; i--) {
      const moreWords = await db.word.findMany({
        where: {
          cefrLevel: levelOrder[i],
          userProgress: {
            none: { userId },
          },
        },
        orderBy: { frequency: "asc" },
        take: count - words.length,
      });
      words.push(...moreWords);
    }

    // Also try higher levels
    for (let i = currentIdx + 1; i < levelOrder.length && words.length < count; i++) {
      const moreWords = await db.word.findMany({
        where: {
          cefrLevel: levelOrder[i],
          userProgress: {
            none: { userId },
          },
        },
        orderBy: { frequency: "asc" },
        take: count - words.length,
      });
      words.push(...moreWords);
    }
  }

  return words;
}
