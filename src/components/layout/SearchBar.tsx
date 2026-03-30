"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useTTS } from "@/hooks/useTTS";

interface SearchBarProps {
  onClose: () => void;
}

const posLabels: Record<string, string> = {
  NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
  PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
  INTERJECTION: "interj.", DETERMINER: "det.",
  PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
};

export function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { speak } = useTTS();

  const searchResults = trpc.word.search.useQuery({ query }, { enabled: query.length >= 2 });
  const topicsQuery = trpc.word.getTopics.useQuery();

  const matchingTopics = query.length >= 2
    ? (topicsQuery.data ?? []).filter(
        (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.nameVi.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-background" onClick={onClose}>
      <div className="mx-auto max-w-lg px-5 pt-4 pb-8 h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
              placeholder="Search words, topics..."
              className="w-full rounded-xl bg-card pl-10 pr-4 py-3 text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <button onClick={onClose} className="text-sm text-muted hover:text-foreground transition-colors">Cancel</button>
        </div>

        {query.length < 2 && <p className="text-center text-muted text-sm py-8">Type at least 2 characters</p>}

        {matchingTopics.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted uppercase mb-2">Topics</h3>
            <div className="space-y-1">
              {matchingTopics.map((topic) => (
                <button key={topic.id} onClick={onClose} className="flex items-center gap-3 w-full rounded-xl bg-card px-4 py-3 hover:bg-card-hover transition-colors text-left">
                  <span className="text-xl">{topic.icon || "📖"}</span>
                  <span className="font-medium text-sm">{topic.nameVi || topic.name}</span>
                  <span className="text-xs text-muted ml-auto">{topic._count.words}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {searchResults.data && searchResults.data.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted uppercase mb-2">Words</h3>
            <div className="space-y-1">
              {searchResults.data.map((word) => (
                <button key={word.id} onClick={() => { onClose(); router.push(`/browse/${word.id}`); }} className="flex items-center gap-3 w-full rounded-xl px-4 py-3 hover:bg-card transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{word.word}</span>
                      <span className="text-xs text-muted">({posLabels[word.partOfSpeech] ?? word.partOfSpeech})</span>
                    </div>
                    <p className="text-sm text-muted truncate">{word.definitionEn}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {query.length >= 2 && searchResults.data?.length === 0 && matchingTopics.length === 0 && (
          <p className="text-center text-muted text-sm py-8">No results found</p>
        )}

        {searchResults.isLoading && query.length >= 2 && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse rounded-xl bg-card h-14" />)}
          </div>
        )}
      </div>
    </div>
  );
}
