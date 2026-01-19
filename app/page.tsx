"use client";

import { useState, useRef, useEffect } from "react";
import type { AnalysisResult, WebflowExport } from "@/lib/types";
import { MappingGraph } from "./components/MappingGraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type AnalysisState = {
  status: "idle" | "analyzing" | "success" | "error";
  progress?: number;
  stage?: string;
  message?: string;
  analysis?: AnalysisResult;
  webflowExport?: WebflowExport;
  error?: string;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
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
              error: "Analysis session expired. This can happen after a deployment or server restart. Please try analyzing again.",
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
              error: statusResult.error || statusResult.message || "Analysis failed",
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
      a.download = format === "generic" 
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Webflow UI Mapper</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="py-12">
        <div className="container mx-auto px-4 max-w-[1440px]">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">
              Transform Websites to Webflow
            </h2>
            <p className="text-lg text-muted-foreground">
              Automatically map any website to Webflow Collections, Symbols, and Bindings using AI
            </p>
        </div>

          <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
              disabled={state.status === "analyzing"}
            />
              <Button
              onClick={handleAnalyze}
              disabled={state.status === "analyzing"}
            >
                {state.status === "analyzing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing
                  </>
                ) : (
                  "Analyze"
                )}
              </Button>
          </div>
          </CardContent>
        </Card>
        </div>

        {state.status === "analyzing" && (
          <div className="container mx-auto px-4 max-w-[1440px]">
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
            <div className="flex items-center gap-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {state.message || "Analyzing website..."}
                </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {state.stage || "processing"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {state.progress || 0}%
                </p>
              </div>
            </div>
                <Progress value={state.progress || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {state.status === "error" && (
          <div className="container mx-auto px-4 max-w-[1440px]">
          <Alert variant="warning" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
          </div>
        )}

        {state.status === "success" && state.analysis && (
          <div className="space-y-10">
            {/* Export Actions */}
            <div className="container mx-auto px-4 max-w-[1440px]">
            <Card className="border-0 shadow-none">
              <CardHeader className="p-0 pb-4">
                <CardTitle>Export Options</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Generic Export (Platform-Agnostic)
                  </h3>
                  <Button
                    onClick={() => handleExport("generic")}
                    className="w-full"
                    variant="secondary"
                  >
                    <FileJson className="mr-2 h-4 w-4" />
                    Export Generic JSON
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Platform-agnostic format with models, components, and mappings
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Webflow Export
                  </h3>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleExport("json")}
                      className="flex-1"
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Export JSON
                    </Button>
                    <Button
                      onClick={() => handleExport("csv")}
                      className="flex-1"
                      variant="secondary"
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Visual Graph */}
            <div className="container mx-auto px-4 max-w-[1440px]">
              <Card className="border-0 shadow-none">
                <CardHeader className="p-0 pb-4">
                  <CardTitle>Mapping Visualization</CardTitle>
                  <CardDescription>
                Interactive graph showing relationships between content models and UI components
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-0">
              <MappingGraph
                models={state.analysis.contentModels}
                components={state.analysis.uiComponents}
                mappings={state.analysis.mappings}
              />
                </CardContent>
              </Card>
            </div>

            {/* Mappings - Moved right after Visualization */}
            <div className="container mx-auto px-4 max-w-[1440px]">
            <Card className="border-0 shadow-none">
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center gap-2">
                  <CardTitle>Mappings</CardTitle>
                  <Badge variant="secondary">
                    {state.analysis.mappings.length}
                  </Badge>
                        </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                {state.analysis.mappings.map((mapping, mappingIndex) => (
                    <Card key={`mapping-${mapping.pageName}-${mappingIndex}`} className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{mapping.pageName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                      {mapping.componentMappings.map((cm, cmIndex) => {
                        // Guard against undefined/null slotMappings
                        const slotMappings = cm.slotMappings || {};
                        
                        return (
                            <Card key={`${mapping.pageName}-${cm.componentName}-${cmIndex}`} className="bg-muted/30 border">
                              <CardHeader className="pb-2 pt-3">
                                <CardTitle className="text-sm font-medium">{cm.componentName}</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(slotMappings)
                              .filter(([_, modelPath]) => {
                                // Filter out invalid mappings (null, undefined, or non-string objects)
                                if (modelPath === null || modelPath === undefined) {
                                  return false;
                                }
                                if (typeof modelPath === "string") {
                                  return true;
                                }
                                // For objects, we'll convert them to strings, so include them
                                return true;
                              })
                              .map(([slot, modelPath], slotIndex) => {
                                // Safely convert modelPath to string for rendering
                                let displayPath: string;
                                if (typeof modelPath === "string") {
                                  displayPath = modelPath;
                                } else if (modelPath === null || modelPath === undefined) {
                                  displayPath = "(unmapped)";
                                } else if (typeof modelPath === "object") {
                                  // If it's an object, try to extract a meaningful value
                                  const obj = modelPath as Record<string, unknown>;
                                  if ("label" in obj && typeof obj.label === "string") {
                                    displayPath = obj.label;
                                  } else if ("url" in obj && typeof obj.url === "string") {
                                    displayPath = obj.url;
                                  } else if ("path" in obj && typeof obj.path === "string") {
                                    displayPath = obj.path;
                                  } else {
                                    // Fallback: stringify the object (but make it readable)
                                    try {
                                      displayPath = JSON.stringify(obj, null, 2);
                                    } catch {
                                      displayPath = String(obj);
                                    }
                                  }
                                } else {
                                  displayPath = String(modelPath);
                                }
                                
                                // Final safety check: ensure displayPath is always a string
                                const safeDisplayPath = typeof displayPath === "string" 
                                  ? displayPath 
                                  : String(displayPath ?? "(invalid mapping)");
                                
                                return (
                                  <div
                                    key={`${mapping.pageName}-${cm.componentName}-${slot}-${slotIndex}`}
                                          className="text-sm"
                                  >
                                    <span className="font-medium">{slot}</span> →{" "}
                                          <Badge variant="outline" className="font-mono text-xs">
                                      {safeDisplayPath}
                                          </Badge>
                                  </div>
                                );
                              })}
                          </div>
                              </CardContent>
                            </Card>
                        );
                      })}
                    </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Content Models */}
            <div className="container mx-auto px-4 max-w-[1440px]">
            <Card className="border-0 shadow-none">
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center gap-2">
                  <CardTitle>Content Models</CardTitle>
                  <Badge variant="secondary">
                    {state.analysis.contentModels.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                  {state.analysis.contentModels.map((model, modelIndex) => (
                    <Card key={`model-${model.name}-${modelIndex}`} className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{model.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {model.fields.map((field, fieldIndex) => (
                            <div
                              key={`field-${model.name}-${field.name}-${fieldIndex}`}
                              className="text-sm"
                            >
                              <span className="font-medium">{field.name}:</span>{" "}
                              <Badge variant="outline" className="text-xs">{field.type}</Badge>
                  </div>
                ))}
              </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* UI Components */}
            <div className="container mx-auto px-4 max-w-[1440px]">
            <Card className="border-0 shadow-none">
              <CardHeader className="p-0 pb-4">
                <div className="flex items-center gap-2">
                  <CardTitle>UI Components</CardTitle>
                  <Badge variant="secondary">
                    {state.analysis.uiComponents.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                  {state.analysis.uiComponents.map((component, componentIndex) => (
                    <Card key={`component-${component.name}-${componentIndex}`} className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{component.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">
                          {component.selector}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {component.slots.map((slot, slotIndex) => (
                            <Badge
                              key={`slot-${component.name}-${slot.name}-${slotIndex}`}
                              variant="outline"
                              className="text-xs"
                            >
                              {slot.name} ({slot.type})
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Screenshot */}
            {state.analysis.metadata.screenshotPath && (
              <div className="container mx-auto px-4 max-w-[1440px]">
                <Card className="border-0 shadow-none">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle>Screenshot</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                <img
                  src={state.analysis.metadata.screenshotPath}
                  alt="Website screenshot"
                      className="rounded-lg border w-full"
                />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
