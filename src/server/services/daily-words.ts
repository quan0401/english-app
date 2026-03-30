import type { PrismaClient } from "@/generated/prisma/client";
import type { CefrLevel } from "@/generated/prisma/enums";

/**
 * Get daily words for the learn feed.
 *
 * Strategy:
 * - Pick unseen words at the user's CEFR level (and adjacent levels)
 * - Filter out stubs (needsCrawl = true) and [pending] translations
 * - Mix difficulties: 60% at user's level, 20% one level up, 20% one level down
 * - Add randomization so it's not the same words every day
 */
export async function getDailyWords(
  db: PrismaClient,
  userId: string,
  cefrLevel: CefrLevel,
  count: number = 10
) {
  const levelOrder: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];
  const currentIdx = levelOrder.indexOf(cefrLevel);

  const baseFilter = {
    needsCrawl: false,
    definitionEn: { not: "[pending]" },
    userProgress: { none: { userId } },
  };

  // Get a pool of candidates (3x the needed count for randomization)
  const poolSize = count * 3;

  // Main level words
  const mainPool = await db.word.findMany({
    where: { ...baseFilter, cefrLevel },
    orderBy: { frequency: "asc" },
    take: poolSize,
  });

  // One level up (harder)
  const harderPool = currentIdx + 1 < levelOrder.length
    ? await db.word.findMany({
        where: { ...baseFilter, cefrLevel: levelOrder[currentIdx + 1] },
        orderBy: { frequency: "asc" },
        take: Math.ceil(poolSize * 0.3),
      })
    : [];

  // One level down (easier review)
  const easierPool = currentIdx - 1 >= 0
    ? await db.word.findMany({
        where: { ...baseFilter, cefrLevel: levelOrder[currentIdx - 1] },
        orderBy: { frequency: "asc" },
        take: Math.ceil(poolSize * 0.3),
      })
    : [];

  // Shuffle each pool
  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Mix: 60% main, 20% harder, 20% easier
  const mainCount = Math.ceil(count * 0.6);
  const harderCount = Math.ceil(count * 0.2);
  const easierCount = count - mainCount - harderCount;

  const selected = [
    ...shuffle(mainPool).slice(0, mainCount),
    ...shuffle(harderPool).slice(0, harderCount),
    ...shuffle(easierPool).slice(0, easierCount),
  ];

  // If not enough, fill from main pool
  if (selected.length < count) {
    const remaining = shuffle(mainPool).filter(
      (w) => !selected.some((s) => s.id === w.id)
    );
    selected.push(...remaining.slice(0, count - selected.length));
  }

  // Final shuffle so harder/easier aren't grouped
  return shuffle(selected).slice(0, count);
}
