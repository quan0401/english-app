import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-2xl bg-card", className)}
        />
      ))}
    </>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton count={count} className="h-28" />
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton count={count} className="h-16" />
    </div>
  );
}
