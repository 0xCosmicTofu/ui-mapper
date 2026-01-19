"use client";

import { cn } from "@/lib/utils";
import { Home, GitBranch, Image } from "lucide-react";

export type ViewType = "home" | "visualizer" | "screenshot";

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  hasScreenshot: boolean;
}

const navItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "visualizer", label: "Mapping Visualizer", icon: GitBranch },
  { id: "screenshot", label: "Screenshot", icon: Image },
];

export function Sidebar({ activeView, onViewChange, hasScreenshot }: SidebarProps) {
  return (
    <aside className="w-52 border-r bg-muted/30 flex flex-col shrink-0">
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDisabled = item.id === "screenshot" && !hasScreenshot;
          
          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onViewChange(item.id)}
              disabled={isDisabled}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
