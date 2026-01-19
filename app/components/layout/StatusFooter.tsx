"use client";

import { cn } from "@/lib/utils";

type StatusType = "idle" | "analyzing" | "success" | "error";

interface StatusFooterProps {
  analysisStatus: StatusType;
  analysisMessage?: string;
}

const statusConfig: Record<StatusType, { color: string; label: string }> = {
  idle: { color: "bg-green-500", label: "Ready" },
  analyzing: { color: "bg-yellow-500 animate-pulse", label: "Analyzing" },
  success: { color: "bg-green-500", label: "Complete" },
  error: { color: "bg-red-500", label: "Error" },
};

export function StatusFooter({ analysisStatus, analysisMessage }: StatusFooterProps) {
  const config = statusConfig[analysisStatus];

  return (
    <footer className="h-8 border-t bg-muted/30 flex items-center justify-between px-4 shrink-0">
      {/* Left: Status indicator */}
      <div className="flex items-center gap-2">
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        <span className="text-xs text-muted-foreground">
          {analysisMessage || config.label}
        </span>
      </div>

      {/* Right: Branding */}
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        Built by LimeStudio
      </span>
    </footer>
  );
}
