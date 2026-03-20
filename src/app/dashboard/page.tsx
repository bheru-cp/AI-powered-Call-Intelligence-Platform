import { SiteHeader } from "@/components/site-header";
import { DashboardMain } from "@/components/dashboard-main";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 space-y-3 border-b border-border/60 pb-8">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/80">
            Intelligence overview
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Main dashboard</h1>
          <p className="max-w-2xl text-pretty text-muted-foreground leading-relaxed">
            High-level view of analyzed calls: volume, sentiment, quality scores, duration,
            recurring topics, and open follow-ups across your library.
          </p>
        </div>
        <DashboardMain />
      </main>
    </div>
  );
}
