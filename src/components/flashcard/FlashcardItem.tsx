"use client";

import { useState } from "react";
import { PronunciationButton } from "@/components/word/PronunciationButton";

interface FlashcardItemProps {
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  cefrLevel: string;
  definitionEn: string;
  translationVi: string;
  exampleSentence: string;
  onResult: (known: boolean) => void;
}

const posLabels: Record<string, string> = {
  NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
  PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
  INTERJECTION: "interj.", DETERMINER: "det.",
  PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
};

export function FlashcardItem({
  word, phonetic, partOfSpeech, cefrLevel,
  definitionEn, translationVi, exampleSentence, onResult,
}: FlashcardItemProps) {
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
            <p className="text-muted text-sm mt-6">Nhấn để lật thẻ</p>
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
        <div className="flex gap-3 mt-6 justify-center">
          <button
            onClick={() => onResult(false)}
            className="flex-1 rounded-xl bg-danger/10 px-6 py-3 text-sm font-medium text-danger hover:bg-danger/20 transition-colors"
          >
            Chưa biết
          </button>
          <button
            onClick={() => onResult(true)}
            className="flex-1 rounded-xl bg-success/10 px-6 py-3 text-sm font-medium text-success hover:bg-success/20 transition-colors"
          >
            Đã biết
          </button>
        </div>
      )}
    </div>
  );
}
