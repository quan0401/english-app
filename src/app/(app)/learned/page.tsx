"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { WordCard } from "@/components/word/WordCard";
import { WordListItem } from "@/components/word/WordListItem";
import { ViewToggle } from "@/components/layout/ViewToggle";
import { cn } from "@/lib/utils";

export default function LearnedPage() {
  return (
    <Suspense>
      <LearnedContent />
    </Suspense>
  );
}

const statusOptions = [
  { key: "ALL", label: "Tất cả" },
  { key: "MASTERED", label: "Thuộc lòng" },
  { key: "REVIEW", label: "Đang ôn" },
  { key: "LEARNING", label: "Đang học" },
  { key: "NEW", label: "Mới" },
] as const;

function LearnedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ALL";

  const [status, setStatus] = useState<string>(initialStatus);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "list">("list");

  const query = trpc.progress.getLearnedWords.useQuery(
    { status: status as any, page },
    { placeholderData: (prev) => prev }
  );

  return (
    <div className="mx-auto max-w-lg px-5 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border text-muted hover:text-foreground transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        </button>
        <h1 className="text-2xl font-bold flex-1">Từ đã học</h1>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {statusOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => { setStatus(opt.key); setPage(1); }}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer",
              status === opt.key ? "bg-primary text-white" : "bg-card border border-border text-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {query.isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-20" />)}
        </div>
      )}

      {/* Results */}
      {query.data && (
        <>
          <p className="text-sm text-muted">{query.data.total} từ</p>

          {query.data.words.length === 0 ? (
            <p className="text-center text-muted py-8 text-sm">Chưa có từ nào.</p>
          ) : (
            <div className={viewMode === "card" ? "space-y-3" : "space-y-1.5"}>
              {viewMode === "card"
                ? query.data.words.map((w: any) => <WordCard key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} cefrLevel={w.cefrLevel} definitionEn={w.definitionEn} translationVi={w.translationVi} exampleSentence={w.exampleSentence} />)
                : query.data.words.map((w: any) => <WordListItem key={w.id} id={w.id} word={w.word} phonetic={w.phonetic} partOfSpeech={w.partOfSpeech} definitionEn={w.definitionEn} translationVi={w.translationVi} />)
              }
            </div>
          )}

          {/* Pagination */}
          {query.data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover disabled:opacity-30 cursor-pointer">&lt;</button>
              <span className="text-sm text-muted px-2">{page} / {query.data.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(query.data!.totalPages, p + 1))} disabled={page === query.data.totalPages} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card-hover disabled:opacity-30 cursor-pointer">&gt;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
