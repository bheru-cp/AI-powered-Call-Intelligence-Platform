"use client";

import {
  Brain,
  Gauge,
  Lightbulb,
  Mic,
  Upload,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "upload", label: "Upload Audio", Icon: Upload },
  { key: "transcribe", label: "Transcribe", Icon: Mic },
  { key: "analyze", label: "AI Analyze", Icon: Brain },
  { key: "insights", label: "Generate Insights", Icon: Lightbulb },
  { key: "dashboard", label: "Dashboard", Icon: Gauge },
] as const;

type Props = {
  /** 0–4 active step emphasis; 4 = pipeline visually complete */
  activeIndex: number;
  failed?: boolean;
  className?: string;
};

export function WorkflowStepper({ activeIndex, failed, className }: Props) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "w-full overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ol className="flex min-w-[640px] items-start justify-between gap-2 px-1 sm:min-w-0 sm:gap-0">
        {STEPS.map((step, i) => {
          const done = !failed && i < activeIndex;
          const current = i === activeIndex && !failed;
          const Icon = step.Icon;
          return (
            <li
              key={step.key}
              className="flex flex-1 flex-col items-center gap-2 text-center"
            >
              <div className="flex w-full items-center">
                {i > 0 ? (
                  <span
                    className={cn(
                      "h-px flex-1 rounded-full",
                      done ? "bg-primary" : "bg-border",
                      failed && i === activeIndex ? "bg-destructive/50" : "",
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" />
                )}
                <motion.div
                  initial={reduce ? false : { scale: 0.92, opacity: 0.6 }}
                  animate={
                    reduce
                      ? undefined
                      : {
                          scale: current ? 1.05 : 1,
                          opacity: 1,
                        }
                  }
                  transition={{ type: "spring", stiffness: 320, damping: 24 }}
                  className={cn(
                    "relative flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-muted-foreground transition-colors sm:size-12",
                    done && "border-primary bg-primary/10 text-primary",
                    current &&
                      !failed &&
                      "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20",
                    failed && current && "border-destructive bg-destructive/10 text-destructive",
                    !done && !current && !failed && "border-border bg-muted/40",
                  )}
                >
                  <Icon className="size-5 sm:size-5" aria-hidden />
                </motion.div>
                {i < STEPS.length - 1 ? (
                  <span
                    className={cn(
                      "h-px flex-1 rounded-full",
                      done ? "bg-primary" : "bg-border",
                    )}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" />
                )}
              </div>
              <span
                className={cn(
                  "max-w-[5.5rem] text-[10px] font-medium leading-tight text-muted-foreground sm:max-w-none sm:text-xs",
                  (done || current) && "text-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
