"use client";

import { trpc } from "@/lib/trpc/client";
import { StreakDisplay } from "@/components/stats/StreakDisplay";
import { WeeklyChart } from "@/components/stats/WeeklyChart";
import { TopicMastery } from "@/components/stats/TopicMastery";
import Link from "next/link";

export default function StatsPage() {
  const streak = trpc.streak.get.useQuery();
  const sessions = trpc.streak.getRecentSessions.useQuery();
  const stats = trpc.progress.getStats.useQuery();
  const topicProgress = trpc.progress.getTopicProgress.useQuery();
  const reviewCount = trpc.progress.getReviewCount.useQuery();
  const topicsQuery = trpc.word.getTopics.useQuery();

  if (streak.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-2xl bg-card p-8 text-center">
          <p className="text-danger">Vui lòng đăng nhập để xem thống kê.</p>
          <Link href="/login" className="inline-block mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  // Compute last 7 days active status
  const recentDays: boolean[] = [];
  const sessionDates = new Set(
    (sessions.data ?? []).map((s) => new Date(s.date).toISOString().split("T")[0])
  );
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    recentDays.push(sessionDates.has(d.toISOString().split("T")[0]));
  }

  // Weekly chart data
  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const session = (sessions.data ?? []).find(
      (s) => new Date(s.date).toISOString().split("T")[0] === dateStr
    );
    weeklyData.push({
      label: dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1],
      learned: session?.wordsLearned ?? 0,
      reviewed: session?.wordsReviewed ?? 0,
    });
  }

  // Learning pace
  const recentSessions = sessions.data ?? [];
  const activeDays = recentSessions.filter((s) => s.wordsLearned + s.wordsReviewed > 0).length;
  const totalWordsThisMonth = recentSessions.reduce((sum, s) => sum + s.wordsLearned + s.wordsReviewed, 0);
  const avgPerDay = activeDays > 0 ? Math.round(totalWordsThisMonth / activeDays) : 0;

  // Topic mastery data
  const topicMasteryData = (topicProgress.data ?? []).map((tp) => {
    const topic = topicsQuery.data?.find((t) => t.id === tp.topicId);
    return {
      name: topic?.name ?? "",
      nameVi: topic?.nameVi ?? "",
      icon: topic?.icon ?? "📖",
      totalWords: tp.totalWords,
      mastered: tp.mastered,
    };
  });

  const isLoading = streak.isLoading || stats.isLoading;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <h1 className="text-3xl font-bold">Thống kê</h1>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          <div className="animate-pulse rounded-2xl bg-card h-36" />
          <div className="animate-pulse rounded-2xl bg-card h-44" />
          <div className="animate-pulse rounded-2xl bg-card h-20" />
        </div>
      )}

      {/* 1. Hero Streak */}
      {streak.data && (
        <StreakDisplay
          currentStreak={streak.data.currentStreak}
          longestStreak={streak.data.longestStreak}
          recentDays={recentDays}
        />
      )}

      {/* 2. Weekly Activity Chart */}
      {!isLoading && <WeeklyChart data={weeklyData} />}

      {/* 3. Quick Stats */}
      {stats.data && (
        <div className="grid grid-cols-3 gap-3">
          <Link href="/learned" className="rounded-2xl bg-card border border-border shadow-sm p-4 text-center hover:bg-card-hover transition-colors">
            <div className="text-2xl font-black">{stats.data.total}</div>
            <div className="text-[10px] text-muted mt-1">Đã học</div>
          </Link>
          <Link href="/learned?status=MASTERED" className="rounded-2xl bg-card border border-border shadow-sm p-4 text-center hover:bg-card-hover transition-colors">
            <div className="text-2xl font-black text-success">{stats.data.mastered}</div>
            <div className="text-[10px] text-muted mt-1">Thuộc lòng</div>
          </Link>
          <Link href="/review" className="rounded-2xl bg-card border border-border shadow-sm p-4 text-center hover:bg-card-hover transition-colors">
            <div className={`text-2xl font-black ${(reviewCount.data ?? 0) > 0 ? "text-warning" : "text-muted"}`}>
              {reviewCount.data ?? 0}
            </div>
            <div className="text-[10px] text-muted mt-1">Cần ôn</div>
          </Link>
        </div>
      )}

      {/* 4. Upcoming Reviews */}
      {(reviewCount.data ?? 0) > 0 && (
        <Link
          href="/review"
          className="flex items-center justify-between rounded-2xl bg-warning/10 border border-warning/20 p-4 hover:bg-warning/15 transition-colors"
        >
          <div>
            <div className="font-semibold text-sm">
              {reviewCount.data} từ cần ôn hôm nay
            </div>
            <div className="text-xs text-muted mt-0.5">Đừng để quên từ đã học!</div>
          </div>
          <span className="rounded-full bg-warning px-4 py-1.5 text-sm font-medium text-white">
            Ôn tập
          </span>
        </Link>
      )}

      {/* 5. Topic Mastery */}
      {topicMasteryData.length > 0 && (
        <TopicMastery topics={topicMasteryData} />
      )}

      {/* 6. Learning Pace */}
      {stats.data && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-3">
          <h3 className="font-semibold">Tốc độ học</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-black text-primary">{avgPerDay}</div>
              <div className="text-xs text-muted">từ/ngày (TB)</div>
            </div>
            <div>
              <div className="text-2xl font-black">{activeDays}</div>
              <div className="text-xs text-muted">ngày hoạt động</div>
            </div>
          </div>

          {/* Progress bar */}
          {stats.data.total > 0 && (
            <div className="space-y-2 pt-2">
              <div className="h-3 rounded-full bg-card-hover overflow-hidden flex">
                <div className="bg-success h-full transition-all" style={{ width: `${(stats.data.mastered / stats.data.total) * 100}%` }} />
                <div className="bg-primary h-full transition-all" style={{ width: `${(stats.data.review / stats.data.total) * 100}%` }} />
                <div className="bg-warning h-full transition-all" style={{ width: `${(stats.data.learning / stats.data.total) * 100}%` }} />
              </div>
              <div className="flex gap-4 text-[10px] text-muted">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Thuộc</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Ôn tập</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Đang học</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings link */}
      <Link
        href="/settings"
        className="flex items-center justify-between rounded-2xl bg-card border border-border shadow-sm p-4 hover:bg-card-hover transition-colors"
      >
        <span className="font-medium text-sm">Hồ sơ & Cài đặt</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-muted">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </Link>
    </div>
  );
}
