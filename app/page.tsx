"use client";

import { useState, useRef, useEffect } from "react";
import type { AnalysisResult, WebflowExport } from "@/lib/mock-data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Layout components
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ViewType } from "./components/layout/Sidebar";

// View components
import { LandingView } from "./components/views/LandingView";
import { HomeView } from "./components/views/HomeView";
import { VisualizerView } from "./components/views/VisualizerView";
import { ScreenshotView } from "./components/views/ScreenshotView";

// Mock data for local UI development (remove import when merging to production)
import { mockAnalysis, mockWebflowExport } from "@/lib/mock-data";

type AnalysisState = {
  status: "idle" | "analyzing" | "success" | "error";
  progress?: number;
  stage?: string;
  message?: string;
  analysis?: AnalysisResult;
  webflowExport?: WebflowExport;
  error?: string;
};

// Check if mock data should be used (for local UI development)
const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AnalysisState>(
    useMockData
      ? {
          status: "success",
          progress: 100,
          stage: "complete",
          message: "Mock data loaded for UI development",
          analysis: mockAnalysis,
          webflowExport: mockWebflowExport,
        }
      : { status: "idle" }
  );
  const [activeView, setActiveView] = useState<ViewType>("home");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      alert("Please enter a URL");
      return;
    }

    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setState({
      status: "analyzing",
      progress: 0,
      stage: "initializing",
      message: "Starting analysis...",
    });

    try {
      // Start the analysis job
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to start analysis");
      }

      // Handle cached results (returned immediately)
      if (result.cached && result.analysis && result.webflowExport) {
        setState({
          status: "success",
          progress: 100,
          stage: "complete",
          message: "Analysis retrieved from cache",
          analysis: result.analysis,
          webflowExport: result.webflowExport,
        });
        return;
      }

      // If no cached result, we need a jobId to poll
      if (!result.jobId) {
        throw new Error("No jobId returned and no cached result");
      }

      const jobId = result.jobId;

      // Poll for status updates
      const pollStatus = async () => {
        try {
          const statusResponse = await fetch(`/api/analyze/status/${jobId}`);

          // Handle 404 - job expired or server restarted
          if (statusResponse.status === 404) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setState({
              status: "error",
              error:
                "Analysis session expired. This can happen after a deployment or server restart. Please try analyzing again.",
            });
            return;
          }

          const statusResult = await statusResponse.json();

          if (!statusResult.success) {
            throw new Error(statusResult.error || "Failed to get status");
          }

          // Update state with progress
          setState((prev) => ({
            ...prev,
            progress: statusResult.progress || prev.progress,
            stage: statusResult.stage || prev.stage,
            message: statusResult.message || prev.message,
          }));

          // Check if complete or error
          if (statusResult.status === "complete") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            setState({
              status: "success",
              progress: 100,
              stage: "complete",
              message: "Analysis complete!",
              analysis: statusResult.result?.analysis,
              webflowExport: statusResult.result?.webflowExport,
            });
          } else if (statusResult.status === "error") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            setState({
              status: "error",
              error:
                statusResult.error || statusResult.message || "Analysis failed",
            });
          }
        } catch (error) {
          console.error("Polling error:", error);
          // Don't stop polling on transient errors, just log
        }
      };

      // Poll immediately, then every 2 seconds
      await pollStatus();
      pollIntervalRef.current = setInterval(pollStatus, 2000);
    } catch (error) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      setState({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleExport = async (format: "json" | "csv" | "generic") => {
    if (format === "generic" && !state.analysis) return;
    if (format !== "generic" && !state.webflowExport) return;

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webflowExport: state.webflowExport,
          analysis: state.analysis,
          format,
          exportType: format === "generic" ? "generic" : "webflow",
        }),
      });

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download =
        format === "generic"
          ? "analysis-export.json"
          : `webflow-export.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed");
    }
  };

  // Determine which view to render based on state
  const isPreAnalysis = state.status === "idle" || state.status === "analyzing";
  const hasResults = state.status === "success" && !!state.analysis;
  const hasScreenshot = !!state.analysis?.metadata.screenshotPath;

  // Pre-analysis: Show landing page
  if (isPreAnalysis && state.status !== "analyzing") {
    return (
      <LandingView
        url={url}
        onUrlChange={setUrl}
        onAnalyze={handleAnalyze}
        isAnalyzing={false}
      />
    );
  }

  // Analyzing: Show landing page with progress
  if (state.status === "analyzing") {
    return (
      <LandingView
        url={url}
        onUrlChange={setUrl}
        onAnalyze={handleAnalyze}
        isAnalyzing={true}
        progress={state.progress}
        stage={state.stage}
        message={state.message}
      />
    );
  }

  // Error state: Show landing page with error
  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
          <LandingView
            url={url}
            onUrlChange={setUrl}
            onAnalyze={handleAnalyze}
            isAnalyzing={false}
          />
        </div>
      </div>
    );
  }

  // Success: Show dashboard
  if (hasResults && state.analysis) {
    const renderContent = () => {
      switch (activeView) {
        case "home":
          return (
            <HomeView
              contentModels={state.analysis!.contentModels}
              uiComponents={state.analysis!.uiComponents}
            />
          );
        case "visualizer":
          return (
            <VisualizerView
              models={state.analysis!.contentModels}
              components={state.analysis!.uiComponents}
              mappings={state.analysis!.mappings}
            />
          );
        case "screenshot":
          return hasScreenshot ? (
            <ScreenshotView
              screenshotPath={state.analysis!.metadata.screenshotPath!}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No screenshot available
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <DashboardLayout
        url={url}
        onUrlChange={setUrl}
        onAnalyze={handleAnalyze}
        onExport={handleExport}
        isAnalyzing={false}
        hasResults={hasResults}
        activeView={activeView}
        onViewChange={setActiveView}
        hasScreenshot={hasScreenshot}
        analysisStatus={state.status}
        analysisMessage={state.message}
      >
        {renderContent()}
      </DashboardLayout>
    );
  }

  // Fallback
  return null;
}
