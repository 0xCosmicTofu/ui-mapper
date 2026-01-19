"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface LandingViewProps {
  url: string;
  onUrlChange: (url: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  progress?: number;
  stage?: string;
  message?: string;
}

export function LandingView({
  url,
  onUrlChange,
  onAnalyze,
  isAnalyzing,
  progress,
  stage,
  message,
}: LandingViewProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAnalyzing) {
      onAnalyze();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">SF</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">StructureFlow</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Transform any website into structured content models and UI components
          </p>
        </div>

        {/* Search/Input Area */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <Input
              type="url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a website URL to analyze..."
              className="flex-1 h-12 text-lg"
              disabled={isAnalyzing}
            />
            <Button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              size="lg"
              className="h-12 px-8"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>

          {/* Progress indicator during analysis */}
          {isAnalyzing && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {message || "Analyzing website..."}
                </span>
                <span className="font-medium">{progress || 0}%</span>
              </div>
              <Progress value={progress || 0} className="h-2" />
              {stage && (
                <p className="text-xs text-muted-foreground capitalize">
                  Stage: {stage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-center text-sm text-muted-foreground">
          Paste any public URL to automatically detect content models, UI components, and their mappings
        </p>
      </div>
    </div>
  );
}
