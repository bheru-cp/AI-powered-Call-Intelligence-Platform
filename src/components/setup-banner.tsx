import { AlertTriangle } from "lucide-react";

export function SetupBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div>
        <p className="font-medium">Configuration needed</p>
        <p className="mt-1 text-muted-foreground dark:text-amber-100/80">{message}</p>
      </div>
    </div>
  );
}
