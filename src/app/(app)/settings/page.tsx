"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { isPushSupported, registerServiceWorker, subscribeToPush } from "@/lib/push";
import Link from "next/link";

const levels = ["A1", "A2", "B1", "B2", "C1"] as const;

export default function SettingsPage() {
  const profile = trpc.user.getProfile.useQuery();
  const updateSettings = trpc.user.updateSettings.useMutation({
    onSuccess: () => profile.refetch(),
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!isPushSupported()) return;
    const registration = await registerServiceWorker();
    if (registration) {
      await subscribeToPush(registration);
      setNotificationsEnabled(Notification.permission === "granted");
    }
  };

  if (profile.error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-2xl bg-card p-8 text-center">
          <p className="text-danger">Vui lòng đăng nhập.</p>
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

  if (profile.isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <h1 className="text-3xl font-bold">Hồ sơ</h1>
        <div className="animate-pulse space-y-3">
          <div className="rounded-2xl bg-card h-20" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl bg-card h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  const user = profile.data!;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <h1 className="text-3xl font-bold">Hồ sơ</h1>

      {/* Profile card */}
      <div className="rounded-2xl bg-card p-5 flex items-center gap-4">
        {user.image ? (
          <img src={user.image} alt="" className="h-14 w-14 rounded-full" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-card-hover flex items-center justify-center text-2xl">
            👤
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg">{user.name || "Người dùng"}</p>
          <p className="text-sm text-muted truncate">{user.email}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {user.cefrLevel}
        </span>
      </div>

      {/* Level card */}
      <div className="rounded-2xl bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Trình độ {user.cefrLevel}</p>
            <p className="text-sm text-muted">Mục tiêu: {user.dailyGoal} từ/ngày</p>
          </div>
          <span className="text-3xl">🎓</span>
        </div>
      </div>

      {/* Settings grid */}
      <h2 className="text-xl font-bold">Tùy chỉnh</h2>
      <div className="grid grid-cols-2 gap-3">
        {/* CEFR Level */}
        <button
          onClick={() => setShowLevelPicker(!showLevelPicker)}
          className="flex flex-col rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left"
        >
          <span className="text-3xl mb-2">📚</span>
          <span className="font-medium text-sm">Trình độ</span>
          <span className="text-xs text-muted">{user.cefrLevel}</span>
        </button>

        {/* Daily Goal */}
        <button
          onClick={() => setShowGoalPicker(!showGoalPicker)}
          className="flex flex-col rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left"
        >
          <span className="text-3xl mb-2">🎯</span>
          <span className="font-medium text-sm">Mục tiêu</span>
          <span className="text-xs text-muted">{user.dailyGoal} từ/ngày</span>
        </button>

        {/* Notifications */}
        <button
          onClick={handleEnableNotifications}
          className="flex flex-col rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left"
        >
          <span className="text-3xl mb-2">⏰</span>
          <span className="font-medium text-sm">Nhắc nhở</span>
          <span className="text-xs text-muted">
            {notificationsEnabled ? "Đã bật" : "Chưa bật"}
          </span>
        </button>

        {/* Language */}
        <button
          onClick={() =>
            updateSettings.mutate({
              uiLanguage: user.uiLanguage === "vi" ? "en" : "vi",
            })
          }
          className="flex flex-col rounded-2xl bg-card p-4 hover:bg-card-hover transition-colors text-left"
        >
          <span className="text-3xl mb-2">🌐</span>
          <span className="font-medium text-sm">Ngôn ngữ</span>
          <span className="text-xs text-muted">
            {user.uiLanguage === "vi" ? "Tiếng Việt" : "English"}
          </span>
        </button>
      </div>

      {/* Level picker */}
      {showLevelPicker && (
        <div className="rounded-2xl bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted">Chọn trình độ</h3>
          <div className="flex gap-2">
            {levels.map((level) => (
              <button
                key={level}
                onClick={() => { updateSettings.mutate({ cefrLevel: level }); setShowLevelPicker(false); }}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  user.cefrLevel === level
                    ? "bg-primary text-background"
                    : "bg-card-hover text-muted hover:text-foreground"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goal picker */}
      {showGoalPicker && (
        <div className="rounded-2xl bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted">
            Mục tiêu: <span className="text-foreground font-bold">{user.dailyGoal} từ/ngày</span>
          </h3>
          <input
            type="range"
            min={1}
            max={30}
            value={user.dailyGoal}
            onChange={(e) => updateSettings.mutate({ dailyGoal: parseInt(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>1</span><span>15</span><span>30</span>
          </div>
        </div>
      )}

      {/* Sign Out */}
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="w-full rounded-2xl bg-card p-4 text-sm font-medium text-danger hover:bg-card-hover transition-colors"
      >
        Đăng xuất
      </button>
    </div>
  );
}
