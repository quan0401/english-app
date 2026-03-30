"use client";

interface DayData {
  label: string;
  learned: number;
  reviewed: number;
}

interface WeeklyChartProps {
  data: DayData[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const maxValue = Math.max(...data.map((d) => d.learned + d.reviewed), 1);

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-5">
      <h3 className="font-semibold mb-4">Tuần này</h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((day, i) => {
          const total = day.learned + day.reviewed;
          const height = total > 0 ? (total / maxValue) * 100 : 4;
          const learnedPct = total > 0 ? (day.learned / total) * 100 : 0;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {total > 0 && (
                <span className="text-xs text-muted">{total}</span>
              )}
              <div
                className="w-full rounded-t-lg overflow-hidden transition-all duration-500"
                style={{ height: `${height}%`, minHeight: "4px" }}
              >
                <div
                  className="bg-primary w-full"
                  style={{ height: `${learnedPct}%` }}
                />
                <div
                  className="bg-primary/30 w-full"
                  style={{ height: `${100 - learnedPct}%` }}
                />
              </div>
              <span className="text-xs text-muted">{day.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-primary" /> Học mới
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-primary/30" /> Ôn tập
        </span>
      </div>
    </div>
  );
}
