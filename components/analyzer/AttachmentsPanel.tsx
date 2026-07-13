"use client";

// Step 4 — attachments. Owns the file-selection flow and its errors; the
// parent only receives the validated attachment list.

import { useRef, useState } from "react";
import {
  ATTACHMENT_ACCEPT,
  fileToAttachmentInput,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_TOTAL_ATTACHMENT_SIZE_BYTES,
  type AttachmentInput,
} from "@/lib/attachments";
import { formatBytes, tpl } from "./format";

type AttachDict = {
  attachButton: string;
  attachHintNoPurpose: string;
  attachHintImage: string;
  attachHint: string;
  attachCount: string;
  attachRemove: string;
  attachTooMany: string;
  attachTooLarge: string;
  attachTotalTooLarge: string;
  attachReadError: string;
};

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export default function AttachmentsPanel({
  dict,
  hasPurpose,
  attachmentsEnabled,
  attachments,
  disabled,
  onChange,
  onError,
}: {
  dict: AttachDict;
  hasPurpose: boolean;
  attachmentsEnabled: boolean;
  attachments: AttachmentInput[];
  disabled: boolean;
  onChange: (files: AttachmentInput[]) => void;
  onError: (message: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [reading, setReading] = useState(false);

  const totalBytes = attachments.reduce((acc, f) => acc + f.size, 0);

  const hint = !hasPurpose
    ? dict.attachHintNoPurpose
    : !attachmentsEnabled
    ? dict.attachHintImage
    : tpl(dict.attachHint, { max: MAX_ATTACHMENTS, size: formatBytes(MAX_ATTACHMENT_SIZE_BYTES) });

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !attachmentsEnabled) return;
    onError(null);
    setReading(true);
    try {
      const incoming = Array.from(files);
      if (attachments.length + incoming.length > MAX_ATTACHMENTS) {
        throw new Error(tpl(dict.attachTooMany, { max: MAX_ATTACHMENTS }));
      }
      const tooLarge = incoming.find((f) => f.size > MAX_ATTACHMENT_SIZE_BYTES);
      if (tooLarge) {
        throw new Error(tpl(dict.attachTooLarge, { name: tooLarge.name, size: formatBytes(MAX_ATTACHMENT_SIZE_BYTES) }));
      }
      const nextTotal = totalBytes + incoming.reduce((acc, f) => acc + f.size, 0);
      if (nextTotal > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
        throw new Error(tpl(dict.attachTotalTooLarge, { size: formatBytes(MAX_TOTAL_ATTACHMENT_SIZE_BYTES) }));
      }
      const next = await Promise.all(incoming.map((f) => fileToAttachmentInput(f)));
      const merged = new Map(attachments.map((f) => [f.name, f]));
      for (const item of next) merged.set(item.name, item);
      onChange(Array.from(merged.values()).slice(0, MAX_ATTACHMENTS));
    } catch (e) {
      onError(e instanceof Error ? e.message : dict.attachReadError);
    } finally {
      setReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-faint">{hint}</p>

        <div className="flex items-center gap-2 sm:justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
            disabled={!attachmentsEnabled || disabled || reading}
          />
          <button
            type="button"
            className="btn btn-ghost h-9 px-3 disabled:opacity-45 disabled:cursor-not-allowed"
            disabled={!attachmentsEnabled || disabled || reading}
            onClick={() => fileInputRef.current?.click()}
            title={hint}
          >
            <UploadIcon className="h-4 w-4" />
            <span>{dict.attachButton}</span>
          </button>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="surface-soft p-3 space-y-2">
          <div className="text-xs text-ink-muted tabular-nums">
            {tpl(dict.attachCount, { n: attachments.length, max: MAX_ATTACHMENTS, size: formatBytes(totalBytes) })}
          </div>
          <ul className="flex flex-wrap gap-2">
            {attachments.map((file) => (
              <li key={file.name} className="pill h-auto py-1.5 gap-2 max-w-full">
                <span className="truncate max-w-55">{file.name}</span>
                <span className="text-ink-faint tabular-nums">{formatBytes(file.size)}</span>
                <button
                  type="button"
                  onClick={() => {
                    onChange(attachments.filter((f) => f.name !== file.name));
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-ink-faint hover:text-danger transition-colors"
                  aria-label={tpl(dict.attachRemove, { name: file.name })}
                  disabled={disabled}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
