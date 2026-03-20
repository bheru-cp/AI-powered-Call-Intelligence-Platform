"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { WorkflowStepper } from "@/components/workflow-stepper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

function getApiErrorMessage(
  payload: object | null,
  res: Response,
): string {
  if (!payload) {
    return `Request failed (${res.status})`;
  }
  const rec = payload as Record<string, unknown>;
  const err = rec.error;
  if (typeof err === "string" && err.length > 0) {
    return err;
  }
  const msg = rec.message;
  if (typeof msg === "string" && msg.length > 0) {
    return msg;
  }
  return `Request failed (${res.status})`;
}

async function readJsonBody(res: Response): Promise<{
  parseOk: boolean;
  data: unknown;
  rawText: string;
}> {
  const rawText = await res.text();
  if (!rawText.trim()) {
    return { parseOk: true, data: null, rawText };
  }
  try {
    return { parseOk: true, data: JSON.parse(rawText) as unknown, rawText };
  } catch {
    return { parseOk: false, data: null, rawText };
  }
}

export function UploadCallForm({ className }: Props) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [progressStep, setProgressStep] = React.useState(0);
  const [canProcessAudio, setCanProcessAudio] = React.useState(true);
  /** Set when GET /api/calls fails (e.g. 503 storage disabled) — distinct from missing OpenAI key. */
  const [backendError, setBackendError] = React.useState<string | null>(null);
  const [healthLoading, setHealthLoading] = React.useState(true);
  const tickRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/calls");
        if (cancelled) return;
        if (!res.ok) {
          let msg = `Server returned ${res.status}`;
          try {
            const errBody = (await res.json()) as { error?: string };
            if (typeof errBody.error === "string" && errBody.error.length > 0) {
              msg = errBody.error;
            }
          } catch {
            /* ignore */
          }
          setBackendError(msg);
          setCanProcessAudio(false);
          return;
        }
        setBackendError(null);
        const body = (await res.json()) as { canProcessAudio?: boolean };
        setCanProcessAudio(body.canProcessAudio !== false);
      } catch {
        if (!cancelled) {
          setBackendError(
            "Could not reach the API. Check that the app is running and the URL is correct (reverse-proxy / base path).",
          );
          setCanProcessAudio(false);
        }
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const startProgressTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    setProgressStep(0);
    tickRef.current = setInterval(() => {
      setProgressStep((s) => Math.min(s + 1, 3));
    }, 4500);
  };

  const stopProgressTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const uploadEnabled =
    !healthLoading && !backendError && canProcessAudio;

  const uploadFile = async (file: File) => {
    if (!uploadEnabled) {
      if (backendError) {
        toast.error(backendError);
        return;
      }
      toast.error(
        "Add OPENAI_API_KEY to .env.local and restart the server before uploading.",
      );
      return;
    }
    const extOk = Boolean(
      file.name.match(/\.(mp3|wav|wave|m4a|webm|ogg|flac|opus|aac)$/i),
    );
    const typeOk =
      file.type.startsWith("audio/") ||
      file.type === "application/octet-stream" ||
      file.type === "";
    if (!typeOk && !extOk) {
      toast.error("Please choose an audio file (WAV, MP3, M4A, WebM, OGG, FLAC, …).");
      return;
    }

    setSubmitting(true);
    startProgressTick();

    const ac = new AbortController();
    try {
      const form = new FormData();
      form.set("file", file);

      const res = await fetch("/api/calls", {
        method: "POST",
        body: form,
        signal: ac.signal,
      });

      const { parseOk, data, rawText } = await readJsonBody(res);
      const payload = parseOk && data && typeof data === "object" ? data : null;
      const id =
        payload && "id" in payload && typeof payload.id === "string"
          ? payload.id
          : undefined;
      const errMsg = getApiErrorMessage(payload, res);

      if (!parseOk) {
        stopProgressTick();
        toast.error(
          `Server returned non-JSON (${res.status}): ${rawText.slice(0, 160)}${rawText.length > 160 ? "…" : ""}`,
        );
        return;
      }

      if (res.status === 202 && id) {
        const procRes = await fetch(`/api/calls/${id}/process`, {
          method: "POST",
          signal: ac.signal,
        });
        const procRead = await readJsonBody(procRes);
        const procPayload =
          procRead.parseOk && procRead.data && typeof procRead.data === "object"
            ? procRead.data
            : null;
        stopProgressTick();

        if (!procRead.parseOk) {
          toast.error(
            `Analysis API returned non-JSON (${procRes.status}): ${procRead.rawText.slice(0, 160)}${procRead.rawText.length > 160 ? "…" : ""}`,
          );
          router.push(`/calls/${id}`);
          return;
        }

        const procStatus =
          procPayload && "status" in procPayload ? procPayload.status : undefined;
        if (procRes.ok && procStatus === "complete") {
          setProgressStep(4);
          toast.success("Call analyzed successfully.");
          router.push(`/calls/${id}`);
          return;
        }

        const procErr = getApiErrorMessage(procPayload, procRes);
        if (procRes.status === 422) {
          toast.error(procErr);
          router.push(`/calls/${id}`);
          return;
        }
        toast.error(procErr);
        router.push(`/calls/${id}`);
        return;
      }

      stopProgressTick();

      if (res.ok && id && payload && "status" in payload && payload.status === "complete") {
        setProgressStep(4);
        toast.success("Call analyzed successfully.");
        router.push(`/calls/${id}`);
        return;
      }

      if (res.status === 422 && id) {
        setProgressStep(Math.min(progressStep, 3));
        toast.error(errMsg);
        router.push(`/calls/${id}`);
        return;
      }

      toast.error(errMsg);
    } catch (e) {
      stopProgressTick();
      if (e instanceof DOMException && e.name === "AbortError") {
        return;
      }
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Request failed: ${msg}`);
    } finally {
      setSubmitting(false);
      stopProgressTick();
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void uploadFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void uploadFile(f);
  };

  const activeIndex = submitting ? Math.max(0, Math.min(progressStep, 3)) : 0;

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <WorkflowStepper activeIndex={activeIndex} failed={false} />

      <div
        role="button"
        tabIndex={uploadEnabled ? 0 : -1}
        onKeyDown={(e) => {
          if (!uploadEnabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          if (!uploadEnabled) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!uploadEnabled) return;
          onDrop(e);
        }}
        className={cn(
          "relative flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition-colors",
          !uploadEnabled
            ? "cursor-not-allowed border-muted-foreground/20 bg-muted/20 opacity-80"
            : "cursor-pointer border-muted-foreground/25 bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
          dragOver && uploadEnabled && "border-primary bg-primary/5",
          submitting && "pointer-events-none opacity-70",
        )}
        onClick={() => uploadEnabled && !submitting && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.wav,.wave,.mp3,.m4a,.webm,.ogg,.flac"
          className="sr-only"
          onChange={onInputChange}
          disabled={submitting || !uploadEnabled}
        />
        {submitting ? (
          <Loader2 className="mb-3 size-10 animate-spin text-primary" />
        ) : (
          <div
            className={cn(
              "mb-3 flex size-14 items-center justify-center rounded-full text-primary",
              uploadEnabled ? "bg-primary/10" : "bg-muted text-muted-foreground",
            )}
          >
            <Upload className="size-7" />
          </div>
        )}
        <p className="text-center text-sm font-medium text-foreground">
          {submitting
            ? "Processing your recording…"
            : healthLoading
              ? "Checking configuration…"
              : backendError
                ? backendError
                : !canProcessAudio
                  ? "Configure OPENAI_API_KEY in .env.local to enable uploads"
                  : "Drop a sales call recording here, or click to browse (WAV supported)"}
        </p>
        <p className="mt-2 max-w-md text-center text-xs text-muted-foreground">
          WAV and other common formats work. We transcribe with Whisper, analyze with GPT, then save
          insights to your dashboard. Max ~24MB per file for this demo.
        </p>
        <Button
          type="button"
          className="mt-6"
          disabled={submitting || !uploadEnabled}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Working…
            </>
          ) : healthLoading ? (
            "Checking…"
          ) : backendError ? (
            "Fix configuration"
          ) : !canProcessAudio ? (
            "Add API key to upload"
          ) : (
            "Select audio file"
          )}
        </Button>
      </div>
    </div>
  );
}
