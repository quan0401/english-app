"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { WordDisplay } from "@/components/flashcard/WordDisplay";
import { ReviewListItem } from "@/components/word/ReviewListItem";
import { ViewToggle } from "@/components/layout/ViewToggle";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ReviewPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const reviewQueue = trpc.progress.getReviewQueue.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const submitReview = trpc.progress.submitReview.useMutation();

  const handleRateCard = (quality: "again" | "hard" | "good" | "easy") => {
    const item = reviewQueue.data?.[currentIndex];
    if (!item) return;
    submitReview.mutate({ wordId: item.wordId, quality });
    setReviewedCount((c) => c + 1);
    if (currentIndex + 1 < (reviewQueue.data?.length ?? 0)) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleRateList = (wordId: string, quality: "again" | "hard" | "good" | "easy") => {
    submitReview.mutate({ wordId, quality });
    setReviewedIds((prev) => new Set(prev).add(wordId));
    setReviewedCount((c) => c + 1);
  };

  if (reviewQueue.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (reviewQueue.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-danger">Vui lòng đăng nhập để ôn tập.</p>
        <Link href="/login" className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const items = reviewQueue.data ?? [];
  const remainingItems = items.filter((item) => !reviewedIds.has(item.wordId));
  const allDone = !items.length || (viewMode === "card" && completed) || (viewMode === "list" && remainingItems.length === 0);

  if (allDone) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        {reviewedCount > 0 ? (
          <>
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-3xl font-bold">Ôn tập xong!</h2>
            <p className="text-muted mt-3">
              Bạn đã ôn tập <span className="text-primary font-bold">{reviewedCount}</span> từ.
            </p>
          </>
        ) : (
          <>
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold">Không có từ cần ôn!</h2>
            <p className="text-muted mt-3">Hãy quay lại sau hoặc học thêm từ mới.</p>
          </>
        )}
        <Link href="/learn" className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors">
          Học từ mới
        </Link>
      </div>
    );
  }

  // Card view — full screen centered word
  if (viewMode === "card") {
    const currentItem = items[currentIndex];
    const progress = (currentIndex / items.length) * 100;

    return (
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-sm text-muted">{currentIndex + 1} / {items.length}</span>
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-card mt-2">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Word display */}
        <WordDisplay
          wordId={currentItem.wordId}
          word={currentItem.word.word}
          phonetic={currentItem.word.phonetic}
          partOfSpeech={currentItem.word.partOfSpeech}
          definitionEn={currentItem.word.definitionEn}
          translationVi={currentItem.word.translationVi}
          exampleSentence={currentItem.word.exampleSentence}
          showActions={false}
        />

        {/* Rating buttons */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: "again" as const, label: "Lại", color: "text-danger" },
              { key: "hard" as const, label: "Khó", color: "text-warning" },
              { key: "good" as const, label: "Tốt", color: "text-primary" },
              { key: "easy" as const, label: "Dễ", color: "text-success" },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleRateCard(btn.key)}
                className={cn(
                  "rounded-full bg-card py-3 text-sm font-medium hover:bg-card-hover transition-colors",
                  btn.color
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ôn tập</h1>
        <ViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted">
          <span>{items.length - remainingItems.length} / {items.length}</span>
          <span>{Math.round(((items.length - remainingItems.length) / items.length) * 100)}%</span>
        </div>
        <div className="h-1 rounded-full bg-card overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((items.length - remainingItems.length) / items.length) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {remainingItems.map((item) => (
          <ReviewListItem
            key={item.id}
            word={item.word.word}
            phonetic={item.word.phonetic}
            partOfSpeech={item.word.partOfSpeech}
            definitionEn={item.word.definitionEn}
            translationVi={item.word.translationVi}
            onRate={(quality) => handleRateList(item.wordId, quality)}
          />
        ))}
      </div>
    </div>
  );
}
