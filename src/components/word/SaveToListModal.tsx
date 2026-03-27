"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface SaveToListModalProps {
  wordId: string;
  onClose: () => void;
}

export function SaveToListModal({ wordId, onClose }: SaveToListModalProps) {
  const [newListName, setNewListName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const utils = trpc.useUtils();
  const listsQuery = trpc.wordLists.getListsForWord.useQuery({ wordId });
  const createList = trpc.wordLists.create.useMutation({
    onSuccess: (newList) => {
      toggleWord.mutate({ listId: newList.id, wordId });
      setNewListName("");
      setShowCreate(false);
      setError("");
      listsQuery.refetch();
    },
    onError: (err) => {
      setError(err.message.includes("Unique") ? "Danh sách đã tồn tại." : "Lỗi khi tạo danh sách.");
    },
  });
  const toggleWord = trpc.wordLists.toggleWord.useMutation({
    onSuccess: () => {
      listsQuery.refetch();
      // Update the bookmark icon color
      utils.favorites.getStatus.invalidate({ wordId });
    },
    onError: (err) => {
      setError("Lỗi: " + err.message);
    },
  });

  const handleCreate = () => {
    const name = newListName.trim();
    if (!name) return;
    setError("");
    createList.mutate({ name });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-background border border-border p-5 pb-24 sm:pb-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Lưu vào danh sách</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Loading */}
        {listsQuery.isLoading && (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-card h-12" />
            ))}
          </div>
        )}

        {/* Auth error */}
        {listsQuery.error && (
          <p className="text-sm text-danger py-4 text-center">
            Vui lòng đăng nhập để sử dụng tính năng này.
          </p>
        )}

        {/* Lists */}
        {listsQuery.data && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {listsQuery.data.length === 0 && !showCreate && (
              <p className="text-sm text-muted py-2 text-center">
                Chưa có danh sách nào.
              </p>
            )}

            {listsQuery.data.map((list) => (
              <button
                key={list.id}
                onClick={() => toggleWord.mutate({ listId: list.id, wordId })}
                disabled={toggleWord.isPending}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors cursor-pointer",
                  list.hasWord ? "bg-primary/10 border border-primary/30" : "bg-card hover:bg-card-hover"
                )}
              >
                <span className="text-xl">{list.icon}</span>
                <div className="flex-1 text-left">
                  <span className="font-medium text-sm">{list.name}</span>
                  <span className="text-xs text-muted ml-2">{list.wordCount} từ</span>
                </div>
                {list.hasWord ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-primary">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted/30" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Create new list */}
        {showCreate ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tên danh sách..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
                className="flex-1 rounded-xl bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none transition-colors"
              />
              <button
                onClick={handleCreate}
                disabled={!newListName.trim() || createList.isPending}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
              >
                {createList.isPending ? "..." : "Tạo"}
              </button>
            </div>
            <button
              onClick={() => { setShowCreate(false); setNewListName(""); }}
              className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Hủy
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3 text-sm font-medium text-primary hover:bg-card-hover transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Tạo danh sách mới
          </button>
        )}
      </div>
    </div>
  );
}
