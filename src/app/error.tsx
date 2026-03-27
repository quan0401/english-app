"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold mb-2">Đã có lỗi xảy ra</h2>
      <p className="text-muted mb-6 max-w-sm">
        {error.message || "Vui lòng thử lại sau."}
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors cursor-pointer"
      >
        Thử lại
      </button>
    </div>
  );
}
