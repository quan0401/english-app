"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useWordActions } from "@/hooks/useWordActions";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const posLabels: Record<string, string> = {
  NOUN: "n.", VERB: "v.", ADJECTIVE: "adj.", ADVERB: "adv.",
  PREPOSITION: "prep.", CONJUNCTION: "conj.", PRONOUN: "pron.",
  INTERJECTION: "interj.", DETERMINER: "det.",
  PHRASAL_VERB: "phr.v.", IDIOM: "idiom",
};

export default function WordDetailPage() {
  const params = useParams<{ wordId: string }>();
  const router = useRouter();
  const wordId = params.wordId;

  const wordQuery = trpc.word.getById.useQuery({ id: wordId });
  const relatedQuery = trpc.word.getRelated.useQuery({ wordId });
  const progressQuery = trpc.progress.getWordProgress.useQuery({ wordId });
  const { isFavorited, isSaved, toggleFavorite, speak } = useWordActions(wordId);

  const [notes, setNotes] = useState<string | null>(null);
  const [notesLoaded, setNotesLoaded] = useState(false);

  const updateNotes = trpc.progress.updateNotes.useMutation({
    onSuccess: () => progressQuery.refetch(),
  });

  // Initialize notes from server
  if (progressQuery.data && !notesLoaded) {
    setNotes(progressQuery.data.notes ?? "");
    setNotesLoaded(true);
  }

  if (wordQuery.isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="animate-pulse rounded-2xl bg-card h-40" />
        <div className="animate-pulse rounded-2xl bg-card h-24" />
      </div>
    );
  }

  if (!wordQuery.data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 text-center">
        <p className="text-muted">Không tìm thấy từ này.</p>
        <button onClick={() => router.back()} className="mt-4 text-primary cursor-pointer">Quay lại</button>
      </div>
    );
  }

  const word = wordQuery.data;
  const progress = progressQuery.data;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        </button>
        <h1 className="text-2xl font-bold flex-1">{word.word}</h1>
        <button onClick={toggleFavorite} className={`flex h-9 w-9 items-center justify-center rounded-full bg-card cursor-pointer ${isFavorited ? "text-primary" : "text-muted"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill={isFavorited ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={isFavorited ? 0 : 1.5} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      {/* Main word card */}
      <div className="rounded-2xl bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => speak(word.word)} className="flex items-center gap-2 rounded-full bg-card-hover px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors cursor-pointer">
            {word.phonetic && <span>{word.phonetic}</span>}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796A.75.75 0 0010.5 16.25V3.75z" />
            </svg>
          </button>
          <span className="text-xs text-muted bg-card-hover rounded px-2 py-0.5">{posLabels[word.partOfSpeech] ?? word.partOfSpeech}</span>
          <span className="text-xs font-medium text-primary bg-primary/10 rounded px-2 py-0.5">{word.cefrLevel}</span>
        </div>

        <p className="text-foreground text-lg">{word.definitionEn}</p>
        <p className="text-primary font-semibold text-lg">{word.translationVi}</p>

        <div className="border-t border-border pt-3">
          <p className="text-sm text-muted italic">&ldquo;{word.exampleSentence}&rdquo;</p>
        </div>

        {word.topic && (
          <div className="flex items-center gap-2">
            <span className="text-sm">{word.topic.icon}</span>
            <span className="text-xs text-muted">{word.topic.nameVi || word.topic.name}</span>
          </div>
        )}
      </div>

      {/* Learning stats */}
      {progress && (
        <div className="rounded-2xl bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted">Tiến độ học</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-success">{progress.timesCorrect}</div>
              <div className="text-xs text-muted">Đúng</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-danger">{progress.timesWrong}</div>
              <div className="text-xs text-muted">Sai</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{progress.status}</div>
              <div className="text-xs text-muted">Trạng thái</div>
            </div>
          </div>
          {progress.lastReviewedAt && (
            <p className="text-xs text-muted text-center">
              Ôn tập lần cuối: {new Date(progress.lastReviewedAt).toLocaleDateString("vi-VN")}
            </p>
          )}
        </div>
      )}

      {/* Notes */}
      <div className="rounded-2xl bg-card p-4 space-y-2">
        <h3 className="text-sm font-medium text-muted">Ghi chú của bạn</h3>
        <textarea
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => {
            if (notes !== (progressQuery.data?.notes ?? "")) {
              updateNotes.mutate({ wordId, notes: notes || null });
            }
          }}
          placeholder="Thêm ghi chú, mẹo nhớ từ..."
          rows={3}
          className="w-full rounded-xl bg-card-hover px-4 py-3 text-sm text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none resize-none transition-colors"
        />
        {updateNotes.isPending && <p className="text-xs text-muted">Đang lưu...</p>}
      </div>

      {/* Related words */}
      {relatedQuery.data && relatedQuery.data.length > 0 && (
        <div className="rounded-2xl bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted">Từ liên quan</h3>
          <div className="flex flex-wrap gap-2">
            {relatedQuery.data.map((w) => (
              <Link
                key={w.id}
                href={`/browse/${w.id}`}
                className="rounded-xl bg-card-hover px-3 py-2 text-sm hover:bg-border transition-colors"
              >
                <span className="font-medium">{w.word}</span>
                <span className="text-xs text-muted ml-1">({posLabels[w.partOfSpeech] ?? w.partOfSpeech})</span>
                <span className="text-xs text-primary ml-1">{w.translationVi}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
