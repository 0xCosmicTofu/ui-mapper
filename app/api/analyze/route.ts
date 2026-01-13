import { NextRequest, NextResponse } from "next/server";
import { SiteAnalyzer } from "@/lib/services/analyzer";
import { z } from "zod";

// Configure max duration for Vercel (300 seconds = 5 minutes)
// This is required for long-running AI analysis
export const maxDuration = 300;

const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  // #region agent log
  console.log("[DEBUG] Analyze API: Request received", {
    location: "app/api/analyze/route.ts:POST",
    timestamp: new Date().toISOString(),
    hypothesisId: "E",
  });
  // #endregion

  try {
    const body = await request.json();
    const { url } = AnalyzeRequestSchema.parse(body);

    // #region agent log
    console.log("[DEBUG] Analyze API: Starting analysis", {
      location: "app/api/analyze/route.ts:POST:analyze",
      url,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    const analyzer = new SiteAnalyzer();
    const result = await analyzer.analyze(url);

    // #region agent log
    console.log("[DEBUG] Analyze API: Analysis completed successfully", {
      location: "app/api/analyze/route.ts:POST:success",
      url,
      componentCount: result.analysis.uiComponents.length,
      modelCount: result.analysis.contentModels.length,
      mappingCount: result.analysis.mappings.length,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    // #region agent log
    const responseStartTime = Date.now();
    console.log("[DEBUG] Analyze API: About to send response", {
      location: "app/api/analyze/route.ts:POST:beforeResponse",
      url,
      resultSize: JSON.stringify(result).length,
      timestamp: new Date().toISOString(),
      hypothesisId: "W",
    });
    // #endregion

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Response created, returning", {
      location: "app/api/analyze/route.ts:POST:afterResponse",
      url,
      responseTime: Date.now() - responseStartTime,
      timestamp: new Date().toISOString(),
      hypothesisId: "W",
    });
    // #endregion

    return response;
  } catch (error) {
    // #region agent log
    console.error("[DEBUG] Analyze API: Error occurred", {
      location: "app/api/analyze/route.ts:POST:error",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    console.error("Analysis error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
