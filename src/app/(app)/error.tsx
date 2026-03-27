"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  const isAuthError =
    error.message?.includes("UNAUTHORIZED") ||
    error.message?.includes("unauthorized");

  if (isAuthError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2">Phiên đăng nhập hết hạn</h2>
        <p className="text-muted mb-6">Vui lòng đăng nhập lại.</p>
        <Link
          href="/login"
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">😵</div>
      <h2 className="text-2xl font-bold mb-2">Có gì đó không ổn</h2>
      <p className="text-muted mb-6 max-w-sm text-sm">
        {error.message || "Lỗi không xác định."}
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
