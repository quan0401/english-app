import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Get today's date in the user's timezone as a Date (midnight UTC representation).
 */
function getTodayInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(now); // "YYYY-MM-DD"
  return new Date(dateStr + "T00:00:00.000Z");
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(a.getTime() - b.getTime()) / msPerDay);
}

export async function updateStreak(
  db: PrismaClient,
  userId: string,
  timezone: string = "Asia/Ho_Chi_Minh"
) {
  const today = getTodayInTimezone(timezone);

  const streak = await db.streak.findUnique({
    where: { userId },
  });

  if (!streak) {
    return db.streak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
      },
    });
  }

  const gap = daysBetween(today, streak.lastActiveDate);

  if (gap === 0) {
    // Already active today
    return streak;
  }

  if (gap === 1) {
    // Consecutive day
    const newCurrent = streak.currentStreak + 1;
    const newLongest = Math.max(newCurrent, streak.longestStreak);
    return db.streak.update({
      where: { userId },
      data: {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastActiveDate: today,
      },
    });
  }

  // Streak broken — reset
  return db.streak.update({
    where: { userId },
    data: {
      currentStreak: 1,
      longestStreak: Math.max(1, streak.longestStreak),
      lastActiveDate: today,
    },
  });
}
