import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Vocab<span className="text-primary">Viet</span>
        </h1>
        <p className="text-muted text-lg max-w-md">
          Học từ vựng tiếng Anh mỗi ngày với bản dịch tiếng Việt và hệ thống
          lặp lại ngắt quãng.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
          >
            Bắt đầu học
          </Link>
        </div>
      </div>
    </main>
  );
}
