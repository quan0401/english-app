import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5">
      <div className="text-center space-y-6 max-w-sm">
        <h1 className="text-4xl font-bold tracking-tight">
          Vocab<span className="text-primary">Viet</span>
        </h1>
        <p className="text-muted text-lg leading-relaxed">
          Học từ vựng tiếng Anh mỗi ngày với bản dịch tiếng Việt và hệ thống lặp lại ngắt quãng.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors shadow-sm"
        >
          Bắt đầu học
        </Link>
      </div>
    </main>
  );
}
