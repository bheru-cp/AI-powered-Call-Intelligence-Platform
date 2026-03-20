import { SiteHeader } from "@/components/site-header";
import { UploadCallForm } from "@/components/upload-call-form";
import { ApiReadyBanner } from "@/components/api-ready-banner";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
        <div>
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Application workflow
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Turn raw sales calls into structured intelligence
            </h1>
            <p className="text-pretty text-muted-foreground sm:max-w-2xl">
              Upload audio, transcribe with Whisper, analyze with GPT, and explore team-level and
              per-call dashboards with sentiment, scores, discovery coverage, and action items.
            </p>
          </div>
        </div>

        <ApiReadyBanner />

        <div className="flex-1">
          <UploadCallForm />
        </div>
      </main>
    </div>
  );
}
