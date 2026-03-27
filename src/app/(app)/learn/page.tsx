"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { WordDisplay } from "@/components/flashcard/WordDisplay";
import Link from "next/link";

export default function LearnPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const dailyWords = trpc.session.getDailyWords.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const wordOfDay = trpc.wordOfDay.getToday.useQuery();
  const recordResult = trpc.session.recordWordResult.useMutation();

  // Track which words have been recorded to avoid duplicates
  const recordedRef = useRef<Set<string>>(new Set());

  const handleRecord = useCallback(
    (wordId: string, known: boolean) => {
      if (recordedRef.current.has(wordId)) return;
      recordedRef.current.add(wordId);
      recordResult.mutate({ wordId, known });
    },
    [recordResult]
  );

  // Snap scroll observer — detect which card is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(index)) setActiveIndex(index);
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    const cards = container.querySelectorAll("[data-index]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [dailyWords.data]);

  if (dailyWords.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (dailyWords.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-danger">Vui lòng đăng nhập để bắt đầu học.</p>
        <Link
          href="/login"
          className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  if (!dailyWords.data?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <p className="text-muted text-lg">Không có từ mới nào hôm nay.</p>
        <Link
          href="/review"
          className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors"
        >
          Ôn tập
        </Link>
      </div>
    );
  }

  const words = dailyWords.data;

  return (
    <div className="flex flex-1 flex-col relative">
      {/* Progress dots — top right */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
        {words.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-6 h-2 bg-primary"
                : i < activeIndex
                ? "w-2 h-2 bg-primary/50"
                : "w-2 h-2 bg-card-hover"
            }`}
          />
        ))}
      </div>

      {/* Scrollable feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {/* Word of the Day */}
        {wordOfDay.data && (
          <div
            data-index={-1}
            className="snap-start flex flex-col"
            style={{ minHeight: "calc(100vh - 8rem)" }}
          >
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-4 text-center">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
                Từ của ngày
              </span>
              <WordDisplay
                wordId={wordOfDay.data.word.id}
                word={wordOfDay.data.word.word}
                phonetic={wordOfDay.data.word.phonetic}
                partOfSpeech={wordOfDay.data.word.partOfSpeech}
                definitionEn={wordOfDay.data.word.definitionEn}
                translationVi={wordOfDay.data.word.translationVi}
                exampleSentence={wordOfDay.data.word.exampleSentence}
              />
            </div>
            <p className="text-center text-xs text-muted pb-4">Vuốt lên để bắt đầu học</p>
          </div>
        )}

        {words.map((word, index) => (
          <div
            key={word.id}
            data-index={index}
            className="snap-start flex flex-col"
            style={{ minHeight: "calc(100vh - 8rem)" }}
          >
            {/* Word display */}
            <WordDisplay
              wordId={word.id}
              word={word.word}
              phonetic={word.phonetic}
              partOfSpeech={word.partOfSpeech}
              definitionEn={word.definitionEn}
              translationVi={word.translationVi}
              exampleSentence={word.exampleSentence}
            />

            {/* Know/Don't know buttons */}
            <div className="px-4 pb-4 space-y-2">
              <div className="flex gap-3">
                <button
                  onClick={() => handleRecord(word.id, false)}
                  className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    recordedRef.current.has(word.id)
                      ? "bg-card-hover text-muted"
                      : "bg-card text-danger hover:bg-card-hover"
                  }`}
                >
                  Chưa biết
                </button>
                <button
                  onClick={() => handleRecord(word.id, true)}
                  className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    recordedRef.current.has(word.id)
                      ? "bg-card-hover text-muted"
                      : "bg-card text-success hover:bg-card-hover"
                  }`}
                >
                  Đã biết
                </button>
              </div>
              <p className="text-center text-xs text-muted">
                {index + 1} / {words.length} · Vuốt lên để tiếp tục
              </p>
            </div>
          </div>
        ))}

        {/* End card */}
        <div
          className="snap-start flex flex-col items-center justify-center px-4 text-center"
          style={{ minHeight: "calc(100vh - 8rem)" }}
        >
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold">Hoàn thành!</h2>
          <p className="text-muted mt-3">
            Bạn đã xem hết <span className="text-primary font-bold">{words.length}</span> từ hôm nay
          </p>
          <div className="flex gap-3 mt-8">
            <Link
              href="/review"
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors"
            >
              Ôn tập ngay
            </Link>
            <button
              onClick={() => {
                recordedRef.current.clear();
                dailyWords.refetch();
                containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                setActiveIndex(0);
              }}
              className="rounded-full bg-card px-6 py-2.5 text-sm font-medium text-foreground hover:bg-card-hover transition-colors cursor-pointer"
            >
              Học thêm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
