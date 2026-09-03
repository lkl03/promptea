"use client";

// Post-result feedback (yes/no + optional reason).

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

type ResultsDict = Record<string, string>;

export default function FeedbackBar({
  dict,
  analysisId,
}: {
  dict: ResultsDict;
  analysisId: string;
}) {
  const toast = useToast();
  const [value, setValue] = useState<"yes" | "no" | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  if (analysisId.trim().length < 10) return null;

  async function send(helpful: "yes" | "no") {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          analysisId,
          helpful,
          reason: helpful === "no" ? reason.trim() || null : null,
        }),
        keepalive: true,
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json?.error ?? dict.feedbackError);
      setValue(helpful);
      toast.show(dict.feedbackThanks, "success");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : dict.feedbackError, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="surface-soft p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-sm text-ink-muted">{dict.feedbackQuestion}</div>

      {value === null ? (
        <>
          <div className="flex items-center gap-2 justify-end">
            <button type="button" className="btn btn-ghost h-9 px-4" disabled={sending} onClick={() => send("yes")}>
              {dict.feedbackYes}
            </button>
            <button type="button" className="btn btn-ghost h-9 px-4" disabled={sending} onClick={() => send("no")}>
              {dict.feedbackNo}
            </button>
          </div>
          <div className="w-full sm:max-w-md">
            <input
              className="field w-full px-3 py-2 text-sm"
              aria-label={dict.feedbackPlaceholder}
              placeholder={dict.feedbackPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={sending}
            />
          </div>
        </>
      ) : (
        <div className="text-xs text-ink-faint" aria-live="polite">
          {value === "yes" ? dict.feedbackSentHelpful : dict.feedbackSentNotHelpful}
        </div>
      )}
    </div>
  );
}
