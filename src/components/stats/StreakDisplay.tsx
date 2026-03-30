"use client";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  recentDays: boolean[];
}

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function StreakDisplay({ currentStreak, longestStreak, recentDays }: StreakDisplayProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-white border border-border p-6 space-y-4">
      {/* Main streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-5xl">🔥</span>
          <div>
            <div className="text-4xl font-black">{currentStreak}</div>
            <div className="text-sm text-muted">ngày liên tiếp</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Kỷ lục</div>
          <div className="text-lg font-bold text-primary">{longestStreak}</div>
        </div>
      </div>

      {/* Weekly dots */}
      <div className="flex items-center justify-between">
        {dayLabels.map((label, i) => {
          const isActive = recentDays[i] ?? false;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-card-hover"
              }`}>
                {isActive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted/30" />
                )}
              </div>
              <span className="text-[10px] text-muted">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
