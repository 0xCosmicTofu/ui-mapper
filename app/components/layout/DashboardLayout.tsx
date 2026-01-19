"use client";

import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar, ViewType } from "./Sidebar";
import { StatusFooter } from "./StatusFooter";

interface DashboardLayoutProps {
  // Header props
  url: string;
  onUrlChange: (url: string) => void;
  onAnalyze: () => void;
  onExport: (format: "json" | "csv" | "generic") => void;
  isAnalyzing: boolean;
  hasResults: boolean;
  
  // Sidebar props
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  hasScreenshot: boolean;
  
  // Status props
  analysisStatus: "idle" | "analyzing" | "success" | "error";
  analysisMessage?: string;
  
  // Content
  children: ReactNode;
}

export function DashboardLayout({
  url,
  onUrlChange,
  onAnalyze,
  onExport,
  isAnalyzing,
  hasResults,
  activeView,
  onViewChange,
  hasScreenshot,
  analysisStatus,
  analysisMessage,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <Header
        url={url}
        onUrlChange={onUrlChange}
        onAnalyze={onAnalyze}
        onExport={onExport}
        isAnalyzing={isAnalyzing}
        hasResults={hasResults}
      />

      {/* Main area with sidebar and content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeView={activeView}
          onViewChange={onViewChange}
          hasScreenshot={hasScreenshot}
        />

        {/* Content area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Footer */}
      <StatusFooter
        analysisStatus={analysisStatus}
        analysisMessage={analysisMessage}
      />
    </div>
  );
}
