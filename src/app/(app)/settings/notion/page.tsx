"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NotionSettingsPage() {
  return (
    <Suspense>
      <NotionSettings />
    </Suspense>
  );
}

function NotionSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  const status = trpc.notion.getStatus.useQuery();
  const saveDbIds = trpc.notion.saveDbIds.useMutation({
    onSuccess: () => status.refetch(),
  });
  const syncToNotion = trpc.notion.syncToNotion.useMutation();
  const syncFromNotion = trpc.notion.syncFromNotion.useMutation();
  const disconnect = trpc.notion.disconnect.useMutation({
    onSuccess: () => status.refetch(),
  });

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [showDbSetup, setShowDbSetup] = useState(false);
  const [dbIds, setDbIds] = useState({
    wordDbId: "",
    listDbId: "",
    progressDbId: "",
    notesDbId: "",
  });

  const handleSync = async (type: "words" | "progress" | "notes" | "lists" | "all") => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncToNotion.mutateAsync({ type, wordLimit: type === "words" ? 50 : undefined });
      const parts = Object.entries(result)
        .map(([key, val]: [string, any]) => `${key}: ${val.synced ?? val.imported ?? 0}`)
        .join(", ");
      setSyncResult(`Sync thanh cong! ${parts}`);
    } catch (err: any) {
      setSyncResult(`Loi: ${err.message}`);
    }
    setSyncing(false);
  };

  const handleImport = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncFromNotion.mutateAsync();
      setSyncResult(`Import thanh cong! Notes: ${result.notes?.imported ?? 0}`);
    } catch (err: any) {
      setSyncResult(`Loi: ${err.message}`);
    }
    setSyncing(false);
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/settings")} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted hover:text-foreground transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        </button>
        <h1 className="text-2xl font-bold">Notion</h1>
      </div>

      {/* Status messages */}
      {success && (
        <p className="text-sm text-success bg-success/10 rounded-xl px-4 py-2">
          {success === "connected" ? "Ket noi Notion thanh cong!" : success}
        </p>
      )}
      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-xl px-4 py-2">
          {error === "denied" ? "Ban da tu choi ket noi." : error === "config" ? "Notion chua duoc cau hinh." : "Da co loi xay ra."}
        </p>
      )}

      {/* Connection status */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Trang thai</h3>
            <p className="text-sm text-muted">
              {status.data?.isConnected ? "Da ket noi" : "Chua ket noi"}
            </p>
          </div>
          <span className={`h-3 w-3 rounded-full ${status.data?.isConnected ? "bg-success" : "bg-muted"}`} />
        </div>

        {status.data?.lastSync && (
          <p className="text-xs text-muted">
            Dong bo lan cuoi: {new Date(status.data.lastSync).toLocaleString("vi-VN")}
          </p>
        )}

        {!status.data?.isConnected ? (
          <a
            href="/api/notion/authorize"
            className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-medium text-white hover:bg-primary-hover transition-colors cursor-pointer"
          >
            Ket noi Notion
          </a>
        ) : (
          <button
            onClick={() => {
              if (confirm("Ngat ket noi Notion?")) disconnect.mutate();
            }}
            className="w-full rounded-xl bg-card-hover py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors cursor-pointer"
          >
            Ngat ket noi
          </button>
        )}
      </div>

      {/* Database IDs setup */}
      {status.data?.isConnected && !status.data?.isSetup && (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <h3 className="font-semibold">Cai dat co so du lieu</h3>
          <p className="text-sm text-muted">
            Nhap ID cua cac database Notion da tao. Tim ID trong URL cua database.
          </p>

          <button
            onClick={() => setShowDbSetup(!showDbSetup)}
            className="w-full rounded-xl bg-primary/10 py-2.5 text-sm text-primary font-medium cursor-pointer"
          >
            {showDbSetup ? "An" : "Cai dat Database IDs"}
          </button>

          {showDbSetup && (
            <div className="space-y-2">
              {[
                { key: "wordDbId", label: "Words DB ID" },
                { key: "listDbId", label: "Lists DB ID" },
                { key: "progressDbId", label: "Progress DB ID" },
                { key: "notesDbId", label: "Notes DB ID" },
              ].map((field) => (
                <input
                  key={field.key}
                  placeholder={field.label}
                  value={dbIds[field.key as keyof typeof dbIds]}
                  onChange={(e) => setDbIds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-xl bg-card-hover px-4 py-2.5 text-sm text-foreground placeholder:text-muted border border-border focus:border-primary focus:outline-none"
                />
              ))}
              <button
                onClick={() => saveDbIds.mutate(dbIds)}
                disabled={!dbIds.wordDbId || saveDbIds.isPending}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50 cursor-pointer"
              >
                {saveDbIds.isPending ? "Dang luu..." : "Luu"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sync actions */}
      {status.data?.isConnected && status.data?.isSetup && (
        <div className="space-y-3">
          <h3 className="font-semibold">Dong bo</h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSync("all")}
              disabled={syncing}
              className="rounded-2xl bg-primary/10 p-4 text-left hover:bg-primary/15 transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="text-2xl">🔄</span>
              <div className="font-medium text-sm mt-2">Dong bo tat ca</div>
              <div className="text-xs text-muted">Push to Notion</div>
            </button>
            <button
              onClick={handleImport}
              disabled={syncing}
              className="rounded-2xl bg-card border border-border p-4 text-left hover:bg-card-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="text-2xl">📥</span>
              <div className="font-medium text-sm mt-2">Import</div>
              <div className="text-xs text-muted">Pull from Notion</div>
            </button>
            <button
              onClick={() => handleSync("words")}
              disabled={syncing}
              className="rounded-2xl bg-card border border-border p-4 text-left hover:bg-card-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="text-2xl">📖</span>
              <div className="font-medium text-sm mt-2">Tu vung</div>
              <div className="text-xs text-muted">50 tu moi nhat</div>
            </button>
            <button
              onClick={() => handleSync("progress")}
              disabled={syncing}
              className="rounded-2xl bg-card border border-border p-4 text-left hover:bg-card-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="text-2xl">📊</span>
              <div className="font-medium text-sm mt-2">Tien do</div>
              <div className="text-xs text-muted">7 ngay gan nhat</div>
            </button>
            <button
              onClick={() => handleSync("notes")}
              disabled={syncing}
              className="rounded-2xl bg-card border border-border p-4 text-left hover:bg-card-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="text-2xl">📝</span>
              <div className="font-medium text-sm mt-2">Ghi chu</div>
              <div className="text-xs text-muted">Notes & mnemonics</div>
            </button>
            <button
              onClick={() => handleSync("lists")}
              disabled={syncing}
              className="rounded-2xl bg-card border border-border p-4 text-left hover:bg-card-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="text-2xl">📚</span>
              <div className="font-medium text-sm mt-2">Danh sach</div>
              <div className="text-xs text-muted">Custom lists</div>
            </button>
          </div>

          {syncing && <p className="text-sm text-muted text-center">Dang dong bo...</p>}
          {syncResult && (
            <p className={`text-sm rounded-xl px-4 py-2 ${syncResult.startsWith("Loi") ? "text-danger bg-danger/10" : "text-success bg-success/10"}`}>
              {syncResult}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
