"use client";

import { cn } from "@/lib/utils";

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
}

interface CalendarHeatmapProps {
  data: DayData[];
}

function getIntensity(count: number): string {
  if (count === 0) return "bg-card";
  if (count <= 5) return "bg-primary/20";
  if (count <= 10) return "bg-primary/40";
  if (count <= 20) return "bg-primary/60";
  return "bg-primary/80";
}

export function CalendarHeatmap({ data }: CalendarHeatmapProps) {
  const dataMap = new Map(data.map((d) => [d.date, d.count]));

  // Generate last 30 days
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({ date: dateStr, count: dataMap.get(dateStr) ?? 0 });
  }

  return (
    <div className="rounded-xl bg-card p-4">
      <h3 className="text-sm font-medium text-muted mb-3">30 ngày qua</h3>
      <div className="grid grid-cols-10 gap-1">
        {days.map((day) => (
          <div
            key={day.date}
            className={cn(
              "aspect-square rounded-sm transition-colors",
              getIntensity(day.count)
            )}
            title={`${day.date}: ${day.count} từ`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 mt-3 justify-end">
        <span className="text-xs text-muted mr-1">Ít</span>
        {[0, 5, 10, 20, 30].map((n) => (
          <div
            key={n}
            className={cn("h-3 w-3 rounded-sm", getIntensity(n))}
          />
        ))}
        <span className="text-xs text-muted ml-1">Nhiều</span>
      </div>
    </div>
  );
}
