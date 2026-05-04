"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Trash2, Upload, X } from "lucide-react";

type AttachmentKind = "prescription" | "lab_report" | "scan" | "xray" | "other";

const KIND_LABELS: Record<AttachmentKind, string> = {
  prescription: "Prescription",
  lab_report: "Lab report",
  scan: "Scan",
  xray: "X-ray",
  other: "Other",
};

const KIND_BADGE: Record<AttachmentKind, string> = {
  prescription: "bg-indigo-100 text-indigo-700",
  lab_report: "bg-emerald-100 text-emerald-700",
  scan: "bg-violet-100 text-violet-700",
  xray: "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-700",
};

const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const ACCEPT_ATTR = ALLOWED_MIME.join(",");

const MAX_BYTES = 25 * 1024 * 1024;

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
  uploadedAt: string;
  uploadedBy: string | null;
};

type UploadItem = {
  id: string; // local-only
  file: File;
  kind: AttachmentKind;
  status: "queued" | "signing" | "uploading" | "confirming" | "done" | "error";
  progress: number; // 0..100
  error?: string;
};

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const fmtSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (mime: string) => mime.startsWith("image/");

const FileGlyph = ({ mime }: { mime: string }) => (
  <span
    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
      isImage(mime) ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"
    }`}
    aria-hidden
  >
    {isImage(mime) ? <ImageIcon size={18} /> : <FileText size={18} />}
  </span>
);

export default function AttachmentsSection({
  appointmentId,
  canEdit,
}: {
  appointmentId: string;
  canEdit: boolean;
}) {
  const [list, setList] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [defaultKind, setDefaultKind] = useState<AttachmentKind>("prescription");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Single fetch on mount; gets re-called after every successful upload or
  // delete. Errors during refetch surface to the user without wiping the
  // current list.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/appointments/${appointmentId}/attachments`, {
      headers: authHeaders(),
    })
      .then(async res => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(
            typeof data.error === "string" ? data.error : "Failed to load",
          );
          return;
        }
        setList(data.attachments ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const refreshList = () => {
    fetch(`/api/appointments/${appointmentId}/attachments`, {
      headers: authHeaders(),
    })
      .then(res => res.json())
      .then(data => setList(data.attachments ?? []))
      .catch(() => {});
  };

  const updateUpload = (id: string, patch: Partial<UploadItem>) => {
    setUploads(prev => prev.map(u => (u.id === id ? { ...u, ...patch } : u)));
  };

  const runUpload = async (item: UploadItem) => {
    updateUpload(item.id, { status: "signing", progress: 0 });
    try {
      // 1. Get signed PUT URL
      const signRes = await fetch(
        `/api/appointments/${appointmentId}/attachments/upload-url`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            filename: item.file.name,
            mimeType: item.file.type,
            size: item.file.size,
            kind: item.kind,
          }),
        },
      );
      const signData = await signRes.json();
      if (!signRes.ok) {
        const msg =
          typeof signData.error === "string"
            ? signData.error
            : signData.error?.issues?.[0]?.message ?? "Failed to start upload";
        updateUpload(item.id, { status: "error", error: msg });
        return;
      }

      // 2. PUT to R2 (XHR so we can report progress)
      updateUpload(item.id, { status: "uploading", progress: 0 });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signData.uploadUrl);
        xhr.setRequestHeader("Content-Type", item.file.type);
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            updateUpload(item.id, {
              progress: Math.round((e.loaded / e.total) * 100),
            });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`R2 PUT failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(item.file);
      });

      // 3. Confirm — server HEADs the object and flips `confirmed: true`
      updateUpload(item.id, { status: "confirming", progress: 100 });
      const confRes = await fetch(
        `/api/appointments/${appointmentId}/attachments/${signData.attachmentId}/confirm`,
        { method: "POST", headers: authHeaders() },
      );
      const confData = await confRes.json();
      if (!confRes.ok) {
        updateUpload(item.id, {
          status: "error",
          error:
            typeof confData.error === "string"
              ? confData.error
              : "Could not confirm upload",
        });
        return;
      }

      updateUpload(item.id, { status: "done" });
      refreshList();
    } catch (err: unknown) {
      updateUpload(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const enqueue = (files: FileList | File[]) => {
    const newItems: UploadItem[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_MIME.includes(file.type)) {
        rejected.push(`${file.name}: unsupported type`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        rejected.push(`${file.name}: exceeds ${fmtSize(MAX_BYTES)} limit`);
        continue;
      }
      newItems.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        kind: defaultKind,
        status: "queued",
        progress: 0,
      });
    }
    if (newItems.length > 0) {
      setUploads(prev => [...prev, ...newItems]);
      // Kick uploads off in parallel — R2 handles concurrent PUTs fine and
      // the user feedback is more responsive than serialising.
      newItems.forEach(item => void runUpload(item));
    }
    if (rejected.length > 0) {
      // Reuse the upload list to surface rejection messages so the user
      // sees them in the same place they expect feedback.
      setUploads(prev => [
        ...prev,
        ...rejected.map(msg => ({
          id: `rej-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: { name: msg, size: 0, type: "" } as File,
          kind: defaultKind,
          status: "error" as const,
          progress: 0,
          error: msg,
        })),
      ]);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      enqueue(e.dataTransfer.files);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) enqueue(e.target.files);
    e.target.value = "";
  };

  const dismissUpload = (id: string) =>
    setUploads(prev => prev.filter(u => u.id !== id));

  const deleteAttachment = async (id: string, filename: string) => {
    if (!confirm(`Delete "${filename}"? This can't be undone.`)) return;
    const res = await fetch(
      `/api/appointments/${appointmentId}/attachments/${id}`,
      { method: "DELETE", headers: authHeaders() },
    );
    if (res.ok) {
      setList(prev => prev.filter(a => a.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "Delete failed");
    }
  };

  // Render nothing in read mode when there are no records — keeps the
  // appointment card compact for visits that didn't generate paperwork.
  if (!canEdit && !loading && list.length === 0 && !loadError) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Records {list.length > 0 ? `(${list.length})` : ""}
        </p>
        {canEdit && (
          <label className="inline-flex items-center gap-2 text-[11px] text-slate-500">
            <span>Default kind</span>
            <select
              value={defaultKind}
              onChange={e => setDefaultKind(e.target.value as AttachmentKind)}
              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
            >
              {(Object.keys(KIND_LABELS) as AttachmentKind[]).map(k => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      ) : loadError ? (
        <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          {loadError}
        </p>
      ) : list.length === 0 && !canEdit ? null : list.length === 0 ? (
        <p className="mt-2 text-xs italic text-slate-400">
          No records yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {list.map(a => (
            <li key={a.id} className="flex items-center gap-3 py-2">
              <FileGlyph mime={a.mimeType} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/appointments/${appointmentId}/attachments/${a.id}/download`}
                    className="truncate text-sm font-medium text-indigo-700 hover:underline"
                    title={a.filename}
                  >
                    {a.filename}
                  </a>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_BADGE[a.kind]}`}
                  >
                    {KIND_LABELS[a.kind]}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {fmtSize(a.size)}
                  {a.uploadedBy ? ` · ${a.uploadedBy}` : ""}
                  {a.uploadedAt
                    ? ` · ${new Date(a.uploadedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => deleteAttachment(a.id, a.filename)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
                  aria-label={`Delete ${a.filename}`}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          <div
            onDragOver={e => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-3 cursor-pointer rounded-lg border-2 border-dashed px-3 py-4 text-center text-xs transition ${
              dragActive
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
            }`}
          >
            <Upload
              size={20}
              className="mx-auto mb-1 text-slate-400"
              aria-hidden
            />
            <p className="font-medium text-slate-700">
              Drop files here or click to choose
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              PDF or images, up to {fmtSize(MAX_BYTES)} each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              onChange={onPick}
              className="hidden"
            />
          </div>

          {uploads.length > 0 && (
            <ul className="mt-2 space-y-1">
              {uploads.map(u => (
                <li
                  key={u.id}
                  className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px]"
                >
                  <span className="flex-1 truncate text-slate-700">
                    {u.file.name}
                  </span>
                  {u.status === "uploading" && (
                    <span className="text-slate-500">{u.progress}%</span>
                  )}
                  {u.status === "signing" && (
                    <span className="text-slate-500">Preparing…</span>
                  )}
                  {u.status === "confirming" && (
                    <span className="text-slate-500">Finalizing…</span>
                  )}
                  {u.status === "done" && (
                    <span className="text-emerald-700">Done</span>
                  )}
                  {u.status === "error" && (
                    <span className="text-red-700" title={u.error}>
                      {u.error || "Failed"}
                    </span>
                  )}
                  {(u.status === "done" || u.status === "error") && (
                    <button
                      type="button"
                      onClick={() => dismissUpload(u.id)}
                      className="text-slate-400 hover:text-slate-600"
                      aria-label="Dismiss"
                    >
                      <X size={12} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
