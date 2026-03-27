"use client";

import { useState } from "react";
import { PronunciationButton } from "@/components/word/PronunciationButton";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  cefrLevel: string;
  definitionEn: string;
  translationVi: string;
  exampleSentence: string;
  onRate: (quality: "again" | "hard" | "good" | "easy") => void;
}

const posLabels: Record<string, string> = {
  NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
  PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
  INTERJECTION: "interj.", DETERMINER: "det.",
  PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
};

const ratingButtons = [
  { key: "again" as const, label: "Lại", color: "bg-danger/10 text-danger hover:bg-danger/20" },
  { key: "hard" as const, label: "Khó", color: "bg-warning/10 text-warning hover:bg-warning/20" },
  { key: "good" as const, label: "Tốt", color: "bg-primary/10 text-primary hover:bg-primary/20" },
  { key: "easy" as const, label: "Dễ", color: "bg-success/10 text-success hover:bg-success/20" },
];

export function ReviewCard({
  word, phonetic, partOfSpeech, cefrLevel,
  definitionEn, translationVi, exampleSentence, onRate,
}: ReviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        className="relative h-80 cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <div
          className="absolute inset-0 transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-card p-8"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-0.5 mb-4">
              {cefrLevel}
            </span>
            <h2 className="text-4xl font-bold mb-2">{word}</h2>
            {phonetic && <p className="text-muted text-sm mb-4">{phonetic}</p>}
            <span className="text-xs text-muted bg-card-hover rounded px-2 py-1">
              {posLabels[partOfSpeech] ?? partOfSpeech}
            </span>
            <p className="text-muted text-sm mt-6">Nhấn để xem đáp án</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl bg-card p-6 overflow-y-auto"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{word}</h2>
              <PronunciationButton word={word} />
            </div>
            <div className="space-y-3 flex-1">
              <p className="text-foreground">{definitionEn}</p>
              <p className="text-primary font-semibold text-lg">{translationVi}</p>
              <p className="text-sm text-muted italic border-t border-border pt-3">
                &ldquo;{exampleSentence}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="grid grid-cols-4 gap-2 mt-6">
          {ratingButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => onRate(btn.key)}
              className={cn(
                "rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                btn.color
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
