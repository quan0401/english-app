import Link from "next/link";

export function AuthRequired({ message }: { message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h2 className="text-xl font-bold mb-2">Yêu cầu đăng nhập</h2>
      <p className="text-muted text-sm mb-6">{message || "Vui lòng đăng nhập để tiếp tục."}</p>
      <Link
        href="/login"
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors"
      >
        Đăng nhập
      </Link>
    </div>
  );
}
