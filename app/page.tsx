"use client";

import { useState } from "react";
import type { AnalysisResult, WebflowExport } from "@/lib/types";
import { MappingGraph } from "./components/MappingGraph";

type AnalysisState = {
  status: "idle" | "analyzing" | "success" | "error";
  analysis?: AnalysisResult;
  webflowExport?: WebflowExport;
  error?: string;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AnalysisState>({ status: "idle" });

  const handleAnalyze = async () => {
    if (!url.trim()) {
      alert("Please enter a URL");
      return;
    }

    setState({ status: "analyzing" });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      setState({
        status: "success",
        analysis: result.data.analysis,
        webflowExport: result.data.webflowExport,
      });
    } catch (error) {
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800">
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Webflow UI Mapper
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Transform any website into Webflow Collections, Symbols, and Bindings
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://token2049.com/dubai"
              className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={state.status === "analyzing"}
            />
            <button
              onClick={handleAnalyze}
              disabled={state.status === "analyzing"}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {state.status === "analyzing" ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>

        {state.status === "analyzing" && (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Analyzing website...
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  This may take 30-60 seconds
                </p>
              </div>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 mb-8">
            <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">
              Error
            </h3>
            <p className="text-red-600 dark:text-red-300">{state.error}</p>
          </div>
        )}

        {state.status === "success" && state.analysis && (
          <div className="space-y-8">
            {/* Export Actions */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                  Export Options
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Generic Export (Platform-Agnostic)
                  </h3>
                  <button
                    onClick={() => handleExport("generic")}
                    className="w-full px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Export Generic JSON
                  </button>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                    Platform-agnostic format with models, components, and mappings
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Webflow Export
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleExport("json")}
                      className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Export Webflow JSON
                    </button>
                    <button
                      onClick={() => handleExport("csv")}
                      className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Export Webflow CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Graph */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                Mapping Visualization
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Interactive graph showing relationships between content models and UI components
              </p>
              <MappingGraph
                models={state.analysis.contentModels}
                components={state.analysis.uiComponents}
                mappings={state.analysis.mappings}
              />
            </div>

            {/* Content Models */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                Content Models ({state.analysis.contentModels.length})
              </h2>
              <div className="space-y-4">
                {state.analysis.contentModels.map((model) => (
                  <div
                    key={model.name}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-lg mb-2 text-zinc-900 dark:text-zinc-100">
                      {model.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {model.fields.map((field) => (
                        <div
                          key={field.name}
                          className="text-sm text-zinc-600 dark:text-zinc-400"
                        >
                          <span className="font-medium">{field.name}:</span>{" "}
                          <span className="text-blue-600 dark:text-blue-400">
                            {field.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UI Components */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                UI Components ({state.analysis.uiComponents.length})
              </h2>
              <div className="space-y-4">
                {state.analysis.uiComponents.map((component) => (
                  <div
                    key={component.name}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-lg mb-2 text-zinc-900 dark:text-zinc-100">
                      {component.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-2 font-mono">
                      {component.selector}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {component.slots.map((slot) => (
                        <span
                          key={slot.name}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm"
                        >
                          {slot.name} ({slot.type})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mappings */}
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                Mappings ({state.analysis.mappings.length})
              </h2>
              <div className="space-y-4">
                {state.analysis.mappings.map((mapping) => (
                  <div
                    key={mapping.pageName}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-lg mb-3 text-zinc-900 dark:text-zinc-100">
                      {mapping.pageName}
                    </h3>
                    <div className="space-y-3">
                      {mapping.componentMappings.map((cm) => (
                        <div
                          key={cm.componentName}
                          className="bg-zinc-50 dark:bg-zinc-900/50 rounded p-3"
                        >
                          <h4 className="font-medium mb-2 text-zinc-800 dark:text-zinc-200">
                            {cm.componentName}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {Object.entries(cm.slotMappings)
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
                              .map(([slot, modelPath]) => {
                                // #region agent log
                                if (typeof window !== 'undefined') {
                                  fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:280',message:'Rendering slot mapping',data:{slot,modelPath,modelPathType:typeof modelPath,isString:typeof modelPath === 'string',isObject:typeof modelPath === 'object' && modelPath !== null,modelPathKeys:typeof modelPath === 'object' && modelPath !== null ? Object.keys(modelPath) : null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H'})}).catch(()=>{});
                                }
                                // #endregion
                                
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
                                    key={slot}
                                    className="text-sm text-zinc-600 dark:text-zinc-400"
                                  >
                                    <span className="font-medium">{slot}</span> →{" "}
                                    <span className="text-purple-600 dark:text-purple-400 font-mono">
                                      {safeDisplayPath}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Screenshot */}
            {state.analysis.metadata.screenshotPath && (
              <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6">
                <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                  Screenshot
                </h2>
                <img
                  src={state.analysis.metadata.screenshotPath}
                  alt="Website screenshot"
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 w-full"
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
