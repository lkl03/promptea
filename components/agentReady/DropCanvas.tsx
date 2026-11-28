"use client";

// components/agentReady/DropCanvas.tsx
//
// v1.9.0 — where an audit starts: a canvas that takes a site by drag and drop.
// Accepted drops: a link or text dragged from anywhere (the address bar, a
// page, one of the example chips below), and a file — a sitemap, a saved page
// or a text file — from which the first web address is read IN THE BROWSER
// (the file itself is never uploaded).
//
// Everything a drag does is also reachable from the keyboard: the address
// field submits on Enter, and each example chip is a button.

import { useId, useRef, useState } from "react";

import type { AgentReadyDict } from "@/lib/uiDict";
import { fmt, urlFromDataTransfer, urlFromFileText } from "./shared";

const EXAMPLES = ["promptea.me", "vercel.com", "react.dev", "wikipedia.org"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_RE = /\.(xml|html?|txt|md|url|webloc)$/i;

type Props = {
  dict: AgentReadyDict;
  disabled?: boolean;
  initialUrl?: string;
  error: string | null;
  onScan: (url: string) => void;
  onError: (message: string | null) => void;
};

export default function DropCanvas({ dict, disabled, initialUrl = "", error, onScan, onError }: Props) {
  const t = dict.canvas;
  const [value, setValue] = useState(initialUrl);
  const [over, setOver] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const depth = useRef(0);
  const inputId = useId();
  const errorId = useId();

  const submit = (raw: string) => {
    const url = raw.trim();
    if (url.length < 3) {
      onError(dict.errors.invalid_url);
      return;
    }
    onError(null);
    setValue(url);
    onScan(url);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_BYTES || !(FILE_RE.test(file.name) || /^text\/|xml|html/.test(file.type))) {
        onError(dict.errors.file_type);
        return;
      }
      try {
        const found = urlFromFileText(await file.text());
        if (found) submit(found);
        else onError(dict.errors.file_no_url);
      } catch {
        onError(dict.errors.file_type);
      }
      return;
    }
    const dropped = urlFromDataTransfer(e.dataTransfer);
    if (dropped) submit(dropped);
    else onError(dict.errors.invalid_url);
  };

  return (
    <div>
      <div
        className="ar-canvas px-4 py-8 sm:px-8 sm:py-10"
        data-over={over}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          setOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setOver(false);
        }}
        onDrop={onDrop}
      >
        <div className="ar-radar" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ ["--d" as string]: "min(34rem, 92%)", ["--i" as string]: i }} />
          ))}
        </div>

        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="ar-drop-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v11m0 0-4-4m4 4 4-4" />
              <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" />
            </svg>
          </span>
          <p className="mt-4 font-title text-xl font-semibold" aria-live="polite">
            {over ? t.dropActive : t.dropTitle}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{t.dropHint}</p>

          <form
            className="mt-6 flex w-full flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              submit(value);
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              {t.inputLabel}
            </label>
            <input
              id={inputId}
              className="field h-11 min-w-0 flex-1 px-3.5"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={2000}
              placeholder={t.placeholder}
              value={value}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) onError(null);
              }}
            />
            <button type="submit" className="btn btn-primary h-11 px-6" disabled={disabled}>
              {t.scanCta}
            </button>
          </form>
          <p id={errorId} role="alert" className="mt-2 min-h-5 text-sm text-danger">
            {error}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-medium text-ink-faint">{t.examplesLabel}</p>
        <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
          {EXAMPLES.map((site) => (
            <li key={site}>
              <button
                type="button"
                className="ar-chip"
                draggable={!disabled}
                disabled={disabled}
                data-dragging={dragging === site}
                aria-label={fmt(t.chipAria, { site })}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", site);
                  e.dataTransfer.setData("text/uri-list", `https://${site}`);
                  e.dataTransfer.effectAllowed = "copy";
                  setDragging(site);
                }}
                onDragEnd={() => setDragging(null)}
                onClick={() => submit(site)}
              >
                <span className="ar-chip-dot" aria-hidden="true" />
                {site}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-ink-faint">{t.note}</p>
      </div>
    </div>
  );
}
