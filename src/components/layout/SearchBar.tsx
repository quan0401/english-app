"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
import { useTTS } from "@/hooks/useTTS";

interface SearchBarProps {
  onClose: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { speak } = useTTS();

  const searchResults = trpc.word.search.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );
  const topicsQuery = trpc.word.getTopics.useQuery();

  // Filter topics client-side
  const matchingTopics = query.length >= 2
    ? (topicsQuery.data ?? []).filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.nameVi.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const posLabels: Record<string, string> = {
    NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
    PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
    INTERJECTION: "interj.", DETERMINER: "det.",
    PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto max-w-lg px-4 pt-4 pb-8 h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-muted absolute left-3 top-1/2 -translate-y-1/2">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm từ, chủ đề..."
              className="w-full rounded-xl bg-card pl-10 pr-4 py-3 text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            Hủy
          </button>
        </div>

        {/* Results */}
        {query.length < 2 && (
          <p className="text-center text-muted text-sm py-8">Nhập ít nhất 2 ký tự để tìm kiếm</p>
        )}

        {/* Topics */}
        {matchingTopics.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted uppercase mb-2">Chủ đề</h3>
            <div className="space-y-1">
              {matchingTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => {
                    onClose();
                    router.push(`/browse?topic=${topic.id}`);
                  }}
                  className="flex items-center gap-3 w-full rounded-xl bg-card px-4 py-3 hover:bg-card-hover transition-colors text-left cursor-pointer"
                >
                  <span className="text-xl">{topic.icon || "📖"}</span>
                  <div>
                    <span className="font-medium text-sm">{topic.nameVi || topic.name}</span>
                    <span className="text-xs text-muted ml-2">{topic._count.words} từ</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Words */}
        {searchResults.data && searchResults.data.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted uppercase mb-2">Từ vựng</h3>
            <div className="space-y-1">
              {searchResults.data.map((word) => (
                <button
                  key={word.id}
                  onClick={() => speak(word.word)}
                  className="flex items-center gap-3 w-full rounded-xl bg-card px-4 py-3 hover:bg-card-hover transition-colors text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{word.word}</span>
                      {word.phonetic && <span className="text-xs text-muted">{word.phonetic}</span>}
                      <span className="text-xs text-muted">({posLabels[word.partOfSpeech] ?? word.partOfSpeech})</span>
                    </div>
                    <p className="text-sm text-muted truncate">{word.definitionEn}</p>
                    <p className="text-sm text-primary truncate">{word.translationVi}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-muted shrink-0">
                    <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796A.75.75 0 0010.5 16.25V3.75z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {query.length >= 2 && searchResults.data?.length === 0 && matchingTopics.length === 0 && (
          <p className="text-center text-muted text-sm py-8">Không tìm thấy kết quả</p>
        )}

        {searchResults.isLoading && query.length >= 2 && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-card h-16" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
