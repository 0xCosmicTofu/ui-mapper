"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Home, GitBranch, Image, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "border-r bg-muted/30 flex flex-col shrink-0 transition-all duration-200",
        isCollapsed ? "w-14" : "w-52"
      )}
    >
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDisabled = item.id === "screenshot" && !hasScreenshot;

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && onViewChange(item.id)}
              disabled={isDisabled}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                isDisabled && "opacity-50 cursor-not-allowed",
                isCollapsed && "justify-center px-2"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full flex items-center gap-2",
            isCollapsed && "justify-center px-2"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
