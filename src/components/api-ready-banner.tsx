"use client";

import * as React from "react";
import { SetupBanner } from "@/components/setup-banner";

type ListPayload = {
  canProcessAudio?: boolean;
  error?: string;
};

export function ApiReadyBanner() {
  const [persistenceError, setPersistenceError] = React.useState<string | null>(
    null,
  );
  const [openAiWarning, setOpenAiWarning] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/calls");
        if (cancelled) return;

        if (res.status === 503) {
          const body = (await res.json()) as ListPayload;
          setPersistenceError(
            body.error ??
              "No storage backend available. Configure Supabase or ensure local file storage is not disabled (see README).",
          );
          setOpenAiWarning(null);
          return;
        }

        if (!res.ok) {
          setPersistenceError("Could not reach the API. Try refreshing the page.");
          setOpenAiWarning(null);
          return;
        }

        setPersistenceError(null);
        const body = (await res.json()) as ListPayload;
        if (body.canProcessAudio === false) {
          setOpenAiWarning(
            "Add OPENAI_API_KEY to a file named .env.local in the project root (copy from .env.example), then restart the dev server or `npm start` so the key is loaded.",
          );
        } else {
          setOpenAiWarning(null);
        }
      } catch {
        if (!cancelled) {
          setPersistenceError("Unable to reach the API. Is the dev server running?");
          setOpenAiWarning(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {persistenceError ? (
        <SetupBanner message={persistenceError} />
      ) : null}
      {openAiWarning ? (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
        >
          <div>
            <p className="font-medium">OpenAI key required for uploads</p>
            <p className="mt-1 text-muted-foreground dark:text-amber-100/85">
              {openAiWarning}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
