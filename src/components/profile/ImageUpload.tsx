"use client";

import { ChangeEvent, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";

const authHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon";

// Uploads an image to R2 (via a signed PUT) and reports back the public CDN
// URL, which the profile form stores in the corresponding field.
export default function ImageUpload({
  label,
  value,
  kind,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  kind: "hero" | "about" | "favicon";
  onChange: (url: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const signRes = await fetch("/api/client/profile/upload-url", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          kind,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) {
        setError(
          typeof signData.error === "string"
            ? signData.error
            : signData.error?.issues?.[0]?.message ?? "Upload failed",
        );
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signData.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      onChange(signData.publicUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void upload(file);
  };

  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1 flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={label}
            className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
            <ImageIcon size={20} />
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <Upload size={12} />
              {busy
                ? `Uploading… ${progress}%`
                : value
                  ? "Replace"
                  : "Upload"}
            </button>
            {value && !busy && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50"
              >
                <X size={12} />
                Remove
              </button>
            )}
          </div>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onPick}
          className="hidden"
        />
      </div>
    </div>
  );
}
