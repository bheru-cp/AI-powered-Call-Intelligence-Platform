import Link from "next/link";
import { LayoutDashboard, Mic2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mic2 className="size-4" />
          </span>
          <span className="hidden sm:inline">Call Intelligence</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-2",
            )}
          >
            <LayoutDashboard className="size-4" />
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
