"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const emojiOptions = ["📚", "📖", "🎯", "💼", "✈️", "🍜", "💻", "🎬", "⚽", "🌿", "❤️", "⭐", "🔥", "🎓", "🏠"];

interface ListEditModalProps {
  listId: string;
  currentName: string;
  currentIcon: string;
  onClose: () => void;
  onDeleted: () => void;
}

export function ListEditModal({ listId, currentName, currentIcon, onClose, onDeleted }: ListEditModalProps) {
  const [name, setName] = useState(currentName);
  const [icon, setIcon] = useState(currentIcon);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const utils = trpc.useUtils();
  const updateList = trpc.wordLists.update.useMutation({
    onSuccess: () => {
      utils.wordLists.getAll.invalidate();
      onClose();
    },
    onError: (err) => {
      setError(err.message.includes("Unique") ? "Tên đã tồn tại." : "Lỗi khi cập nhật.");
    },
  });
  const deleteList = trpc.wordLists.delete.useMutation({
    onSuccess: () => {
      utils.wordLists.getAll.invalidate();
      onDeleted();
    },
    onError: () => setError("Lỗi khi xóa."),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    setError("");
    updateList.mutate({ listId, name: name.trim(), icon });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white border border-border shadow-xl p-5 pb-24 sm:pb-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Chỉnh sửa danh sách</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}

        {/* Icon picker */}
        <div className="space-y-2">
          <label className="text-sm text-muted">Biểu tượng</label>
          <div className="flex flex-wrap gap-2">
            {emojiOptions.map((e) => (
              <button
                key={e}
                onClick={() => setIcon(e)}
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl transition-colors cursor-pointer ${
                  icon === e ? "bg-primary/20 ring-2 ring-primary" : "bg-card hover:bg-card-hover"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm text-muted">Tên danh sách</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-card px-4 py-2.5 text-sm text-foreground border border-border focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || updateList.isPending}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
        >
          {updateList.isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>

        {/* Delete */}
        <div className="border-t border-border pt-4">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-sm text-danger text-center">Xác nhận xóa danh sách này?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl bg-card py-2.5 text-sm text-muted hover:bg-card-hover transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={() => deleteList.mutate({ listId })}
                  disabled={deleteList.isPending}
                  className="flex-1 rounded-xl bg-danger/10 py-2.5 text-sm font-medium text-danger hover:bg-danger/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deleteList.isPending ? "..." : "Xóa"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full text-sm text-danger hover:text-danger/80 transition-colors cursor-pointer"
            >
              Xóa danh sách
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
