"use client";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  recentDays: boolean[]; // last 7 days, true = active
}

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function StreakDisplay({ currentStreak, longestStreak, recentDays }: StreakDisplayProps) {
  return (
    <div className="rounded-2xl bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Chuỗi của bạn</h3>
        <span className="text-xs text-muted">Dài nhất: {longestStreak}</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Fire + number */}
        <div className="flex flex-col items-center">
          <span className="text-4xl">🔥</span>
          <span className="text-2xl font-bold mt-1">{currentStreak}</span>
        </div>

        {/* Weekly dots */}
        <div className="flex-1 flex items-center justify-around">
          {dayLabels.map((label, i) => {
            const isActive = recentDays[i] ?? false;
            return (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted">{label}</span>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                  isActive ? "bg-primary/20" : "bg-card-hover"
                }`}>
                  {isActive ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-primary">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted/30" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
