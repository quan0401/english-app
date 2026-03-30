"use client";

interface TopicData {
  name: string;
  nameVi: string;
  icon: string;
  totalWords: number;
  mastered: number;
}

interface TopicMasteryProps {
  topics: TopicData[];
}

function CircleProgress({ percent, size = 36 }: { percent: number; size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        className="text-card-hover"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary transition-all duration-500"
      />
    </svg>
  );
}

export function TopicMastery({ topics }: TopicMasteryProps) {
  const sorted = [...topics]
    .filter((t) => t.totalWords > 0)
    .map((t) => ({ ...t, pct: Math.round((t.mastered / t.totalWords) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-5 space-y-3">
      <h3 className="font-semibold">Chủ đề mạnh nhất</h3>
      <div className="space-y-3">
        {sorted.map((topic) => (
          <div key={topic.name} className="flex items-center gap-3">
            <span className="text-xl shrink-0">{topic.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{topic.nameVi || topic.name}</div>
              <div className="text-xs text-muted">{topic.mastered}/{topic.totalWords} từ</div>
            </div>
            <div className="relative flex items-center justify-center">
              <CircleProgress percent={topic.pct} />
              <span className="absolute text-[10px] font-bold">{topic.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
