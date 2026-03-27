"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const levels = [
  { key: "A1" as const, label: "A1 - Mới bắt đầu", desc: "Biết các từ cơ bản: hello, thank you, number..." },
  { key: "A2" as const, label: "A2 - Sơ cấp", desc: "Giao tiếp đơn giản trong tình huống hàng ngày" },
  { key: "B1" as const, label: "B1 - Trung cấp", desc: "Hiểu được ý chính khi nghe và đọc" },
  { key: "B2" as const, label: "B2 - Trung cấp cao", desc: "Giao tiếp tự tin trong hầu hết tình huống" },
  { key: "C1" as const, label: "C1 - Nâng cao", desc: "Sử dụng tiếng Anh linh hoạt và hiệu quả" },
];

const goalOptions = [5, 10, 15, 20];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<(typeof levels)[number]["key"]>("A1");
  const [selectedGoal, setSelectedGoal] = useState(10);

  const updateSettings = trpc.user.updateSettings.useMutation({
    onSuccess: () => router.push("/learn"),
  });

  const handleFinish = () => {
    updateSettings.mutate({
      cefrLevel: selectedLevel,
      dailyGoal: selectedGoal,
    });
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-8 bg-primary" : "w-2 bg-card-hover"
              )}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Trình độ của bạn?</h2>
              <p className="text-muted mt-1 text-sm">Chọn mức phù hợp nhất</p>
            </div>
            <div className="space-y-3">
              {levels.map((level) => (
                <button
                  key={level.key}
                  onClick={() => setSelectedLevel(level.key)}
                  className={cn(
                    "w-full rounded-xl p-4 text-left transition-colors border",
                    selectedLevel === level.key
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:bg-card-hover"
                  )}
                >
                  <div className="font-medium">{level.label}</div>
                  <div className="text-sm text-muted mt-0.5">{level.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Tiếp tục
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Mục tiêu hàng ngày?</h2>
              <p className="text-muted mt-1 text-sm">Bạn muốn học bao nhiêu từ mỗi ngày?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {goalOptions.map((goal) => (
                <button
                  key={goal}
                  onClick={() => setSelectedGoal(goal)}
                  className={cn(
                    "rounded-xl p-6 text-center transition-colors border",
                    selectedGoal === goal
                      ? "bg-primary/10 border-primary"
                      : "bg-card border-border hover:bg-card-hover"
                  )}
                >
                  <div className="text-3xl font-bold">{goal}</div>
                  <div className="text-xs text-muted mt-1">từ/ngày</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 rounded-lg bg-card px-4 py-3 text-sm font-medium text-muted hover:bg-card-hover transition-colors"
              >
                Quay lại
              </button>
              <button
                onClick={handleFinish}
                disabled={updateSettings.isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {updateSettings.isPending ? "Đang lưu..." : "Bắt đầu học!"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
