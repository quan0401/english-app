"use client";

import { useState, useEffect } from "react";
import { useWordActions } from "@/hooks/useWordActions";
import { SaveToListModal } from "@/components/word/SaveToListModal";

const posLabels: Record<string, string> = {
  NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
  PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
  INTERJECTION: "interj.", DETERMINER: "det.",
  PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
};

interface WordDisplayProps {
  wordId: string;
  word: string;
  phonetic: string | null;
  partOfSpeech: string;
  definitionEn: string;
  translationVi: string;
  exampleSentence: string;
  showActions?: boolean;
}

export function WordDisplay({
  wordId, word, phonetic, partOfSpeech, definitionEn, translationVi, exampleSentence, showActions = true,
}: WordDisplayProps) {
  const { isFavorited, isSaved, toggleFavorite, speak } = useWordActions(wordId);
  const [showExample, setShowExample] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    setShowExample(false);
  }, [wordId]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-4 text-center overflow-y-auto">
      {/* Word */}
      <button onClick={() => speak(word)} className="group cursor-pointer">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight group-hover:text-primary transition-colors">
          {word}
        </h1>
      </button>

      {/* Phonetic + speaker */}
      <button
        onClick={() => speak(word)}
        className="flex items-center gap-2 mt-3 rounded-full bg-card px-4 py-1.5 text-muted hover:text-foreground transition-colors cursor-pointer"
      >
        {phonetic && <span className="text-sm">{phonetic}</span>}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796A.75.75 0 0010.5 16.25V3.75zM14.325 4.317a.75.75 0 011.061-.02 8.479 8.479 0 010 11.406.75.75 0 11-1.06-1.06 6.979 6.979 0 000-9.265.75.75 0 01-.001-1.06z" />
        </svg>
      </button>

      {/* Definition */}
      <p className="text-muted text-base mt-4 max-w-xs">
        ({posLabels[partOfSpeech] ?? partOfSpeech}) {definitionEn}
      </p>

      {/* Vietnamese */}
      <p className="text-primary font-medium text-base mt-2">{translationVi}</p>

      {/* Action icons */}
      {showActions && (
        <div className="flex items-center gap-5 mt-6">
          {/* Info */}
          <button
            onClick={() => setShowExample(!showExample)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted hover:text-foreground active:scale-95 transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>
          {/* Pronounce */}
          <button
            onClick={() => speak(word)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-muted hover:text-foreground active:scale-95 transition-all cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 01-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
              <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
            </svg>
          </button>
          {/* Heart — optimistic toggle */}
          <button
            onClick={toggleFavorite}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-card active:scale-95 transition-all cursor-pointer ${isFavorited ? "text-primary" : "text-muted hover:text-foreground"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill={isFavorited ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={isFavorited ? 0 : 1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
          {/* Bookmark — save to list */}
          <button
            onClick={() => setShowSaveModal(true)}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-card active:scale-95 transition-all cursor-pointer ${isSaved ? "text-primary" : "text-muted hover:text-foreground"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={isSaved ? 0 : 1.5} stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Example sentence */}
      {showExample && (
        <p className="text-sm text-muted italic mt-4 max-w-xs">
          &ldquo;{exampleSentence}&rdquo;
        </p>
      )}

      {/* Save to list modal */}
      {showSaveModal && (
        <SaveToListModal wordId={wordId} onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
}
