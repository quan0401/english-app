"use client";

import { useState } from "react";
import { PronunciationButton } from "./PronunciationButton";
import { cn } from "@/lib/utils";

interface ReviewListItemProps {
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  definitionEn: string;
  translationVi: string;
  onRate: (quality: "again" | "hard" | "good" | "easy") => void;
}

const posLabels: Record<string, string> = {
  NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
  PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
  INTERJECTION: "interj.", DETERMINER: "det.",
  PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
};

const ratingButtons = [
  { key: "again" as const, label: "Lại", color: "text-danger border-danger/30 hover:bg-danger/10" },
  { key: "hard" as const, label: "Khó", color: "text-warning border-warning/30 hover:bg-warning/10" },
  { key: "good" as const, label: "Tốt", color: "text-primary border-primary/30 hover:bg-primary/10" },
  { key: "easy" as const, label: "Dễ", color: "text-success border-success/30 hover:bg-success/10" },
];

export function ReviewListItem({
  word, phonetic, partOfSpeech, definitionEn, translationVi, onRate,
}: ReviewListItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      {/* Row - tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-card-hover transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{word}</span>
            <span className="text-xs text-muted">{posLabels[partOfSpeech] ?? partOfSpeech}</span>
            {phonetic && <span className="text-xs text-muted hidden sm:inline">{phonetic}</span>}
          </div>
          {expanded && (
            <>
              <p className="text-sm text-muted mt-1">{definitionEn}</p>
              <p className="text-sm text-primary mt-0.5">{translationVi}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!expanded && (
            <span className="text-xs text-muted">Nhấn để xem</span>
          )}
          <PronunciationButton word={word} />
        </div>
      </button>

      {/* Know / Don't know */}
      {expanded && (
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => onRate("again")}
            className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-danger hover:bg-card-hover transition-colors cursor-pointer"
          >
            Chưa biết
          </button>
          <button
            onClick={() => onRate("good")}
            className="flex-1 rounded-lg border border-border py-1.5 text-xs font-medium text-success hover:bg-card-hover transition-colors cursor-pointer"
          >
            Đã biết
          </button>
        </div>
      )}
    </div>
  );
}
