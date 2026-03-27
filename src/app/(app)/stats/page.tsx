"use client";

import { trpc } from "@/lib/trpc/client";
import { StreakDisplay } from "@/components/stats/StreakDisplay";
import Link from "next/link";

export default function StatsPage() {
  const streak = trpc.streak.get.useQuery();
  const sessions = trpc.streak.getRecentSessions.useQuery();
  const stats = trpc.progress.getStats.useQuery();

  if (streak.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-2xl bg-card p-8 text-center">
          <p className="text-danger">Vui lòng đăng nhập để xem thống kê.</p>
          <Link
            href="/login"
            className="inline-block mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors"
          >
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

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <h1 className="text-3xl font-bold">Thống kê</h1>

      {/* Streak */}
      {streak.data && (
        <StreakDisplay
          currentStreak={streak.data.currentStreak}
          longestStreak={streak.data.longestStreak}
          recentDays={recentDays}
        />
      )}

      {/* 2x2 Stat cards */}
      {stats.data && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.data.total}</div>
                <div className="text-sm text-muted mt-1">Đã đọc</div>
              </div>
              <span className="text-primary text-xl">📖</span>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold text-success">{stats.data.mastered}</div>
                <div className="text-sm text-muted mt-1">Đã thuộc</div>
              </div>
              <span className="text-primary text-xl">✅</span>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold text-primary">{stats.data.review}</div>
                <div className="text-sm text-muted mt-1">Ôn tập</div>
              </div>
              <span className="text-primary text-xl">🔄</span>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold text-warning">{stats.data.learning}</div>
                <div className="text-sm text-muted mt-1">Đang học</div>
              </div>
              <span className="text-primary text-xl">📝</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {stats.data && stats.data.total > 0 && (
        <div className="rounded-2xl bg-card p-4 space-y-2">
          <h3 className="text-sm font-medium text-muted">Tiến độ</h3>
          <div className="h-3 rounded-full bg-card-hover overflow-hidden flex">
            <div className="bg-success h-full" style={{ width: `${(stats.data.mastered / stats.data.total) * 100}%` }} />
            <div className="bg-primary h-full" style={{ width: `${(stats.data.review / stats.data.total) * 100}%` }} />
            <div className="bg-warning h-full" style={{ width: `${(stats.data.learning / stats.data.total) * 100}%` }} />
          </div>
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Thuộc</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Ôn tập</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Đang học</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {(streak.isLoading || stats.isLoading) && (
        <div className="space-y-3">
          <div className="animate-pulse rounded-2xl bg-card h-24" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-card h-20" />
            ))}
          </div>
        </div>
      )}

      {/* Link to settings */}
      <Link
        href="/settings"
        className="flex items-center justify-between rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors"
      >
        <span className="font-medium">Hồ sơ & Cài đặt</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-muted">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      </Link>
    </div>
  );
}
