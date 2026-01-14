import { NextRequest, NextResponse } from "next/server";
import { SiteAnalyzer } from "@/lib/services/analyzer";
import { jobStore } from "@/lib/services/job-store";
import { analysisCache } from "@/lib/services/cache";
import { z } from "zod";

// Generate a unique job ID
function generateJobId(): string {
  // Try to use crypto.randomUUID if available (Node.js 14.17.0+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate a simple UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
});

/**
 * Start an analysis job and return immediately with a jobId
 * The actual analysis runs in the background
 */
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

    // Check cache first
    const cacheCheckStart = Date.now();
    const cached = analysisCache.get(url);
    const cacheCheckDuration = Date.now() - cacheCheckStart;
    
    if (cached) {
      // #region agent log
      console.log("[DEBUG] Analyze API: Returning cached result", {
        location: "app/api/analyze/route.ts:POST:cacheHit",
        url,
        timestamp: new Date().toISOString(),
        hypothesisId: "CACHE",
      });
      // #endregion

      // Log cache hit performance
      console.log("[PERF] Cache hit", {
        url,
        cacheCheckDurationMs: cacheCheckDuration,
        totalDurationMs: cacheCheckDuration,
        totalDurationSeconds: (cacheCheckDuration / 1000).toFixed(3),
        cached: true,
        timestamp: new Date().toISOString(),
      });

      // Return cached result immediately
      return NextResponse.json({
        success: true,
        cached: true,
        analysis: cached.analysis,
        webflowExport: cached.webflowExport,
        message: 'Analysis retrieved from cache',
      });
    }

    // Generate job ID
    const jobId = generateJobId();

    // Create job in store
    jobStore.createJob(jobId);

    // #region agent log
    console.log("[DEBUG] Analyze API: Starting background analysis", {
      location: "app/api/analyze/route.ts:POST:startJob",
      url,
      jobId,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    // Start analysis in background (don't await)
    analyzeInBackground(jobId, url).catch((error) => {
      console.error("[DEBUG] Analyze API: Background job error", {
        location: "app/api/analyze/route.ts:POST:backgroundError",
        jobId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        hypothesisId: "E",
      });

      jobStore.updateJob(jobId, {
        status: 'error',
        progress: 0,
        stage: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

    // Return immediately with jobId
    return NextResponse.json({
      success: true,
      jobId,
      status: 'started',
      message: 'Analysis started',
    });
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

/**
 * Run analysis in background and update job status
 */
async function analyzeInBackground(jobId: string, url: string): Promise<void> {
  const analyzer = new SiteAnalyzer();
  const startTime = Date.now();
  const stageTimings: Record<string, number> = {};

  try {
    // Step 1: Scraping (fast, ~1-2s)
    jobStore.updateJob(jobId, {
      status: 'processing',
      progress: 10,
      stage: 'scraping',
      message: 'Scraping site...',
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Step 1 - Scraping", {
      location: "app/api/analyze/route.ts:analyzeInBackground:scrape",
      jobId,
      url,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    const scrapeStart = Date.now();
    const scrapeResult = await analyzer.scraper.scrape(url);
    stageTimings.scraping = Date.now() - scrapeStart;

    jobStore.updateJob(jobId, {
      progress: 20,
      stage: 'scraping',
      message: `Scraped ${scrapeResult.title}`,
    });

    // Step 2 & 3: Component Detection and Content Modeling (combined in single AI call)
    // This saves ~20 seconds by eliminating one AI API call
    jobStore.updateJob(jobId, {
      progress: 30,
      stage: 'components',
      message: 'Detecting components and extracting models...',
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Step 2 & 3 - Combined Component Detection & Content Modeling", {
      location: "app/api/analyze/route.ts:analyzeInBackground:componentsAndModels",
      jobId,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    // Use combined method to get both components and models in one AI call
    const detectionStart = Date.now();
    const { components, models } = await analyzer.componentDetector.detectComponentsAndModels(
      scrapeResult.html,
      scrapeResult.screenshotPath
    );
    stageTimings.componentsAndModels = Date.now() - detectionStart;

    jobStore.updateJob(jobId, {
      progress: 60,
      stage: 'components',
      message: `Found ${components.length} components and ${models.length} content models`,
    });

    // Step 4: Mapping (~30s)
    jobStore.updateJob(jobId, {
      progress: 80,
      stage: 'mappings',
      message: 'Creating mappings...',
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Step 4 - Mapping", {
      location: "app/api/analyze/route.ts:analyzeInBackground:mappings",
      jobId,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    const mappingStart = Date.now();
    const mappings = await analyzer.mappingService.createMappings(
      models,
      components,
      "Homepage"
    );
    stageTimings.mapping = Date.now() - mappingStart;

    jobStore.updateJob(jobId, {
      progress: 90,
      stage: 'mappings',
      message: `Created ${mappings.length} page mappings`,
    });

    // Step 5: Export (fast, <1s)
    jobStore.updateJob(jobId, {
      progress: 95,
      stage: 'export',
      message: 'Generating Webflow export...',
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Step 5 - Export", {
      location: "app/api/analyze/route.ts:analyzeInBackground:export",
      jobId,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    const exportStart = Date.now();
    const webflowExport = analyzer.webflowExporter.exportToWebflow(
      models,
      components,
      mappings
    );

    webflowExport.csvData = analyzer.webflowExporter.generateCSVData(models);
    stageTimings.export = Date.now() - exportStart;

    const analysis = {
      contentModels: models,
      uiComponents: components,
      mappings,
      metadata: {
        url,
        timestamp: new Date().toISOString(),
        screenshotPath: scrapeResult.screenshotPath,
      },
    };

    // Store in cache for future requests
    analysisCache.set(url, analysis, webflowExport);

    // Mark as complete
    jobStore.updateJob(jobId, {
      status: 'complete',
      progress: 100,
      stage: 'complete',
      message: 'Analysis complete!',
      result: {
        analysis,
        webflowExport,
      },
    });

    await analyzer.scraper.close();

    // Calculate total duration
    const totalDuration = Date.now() - startTime;

    // Log performance metrics
    console.log("[PERF] Analysis completed", {
      url,
      jobId,
      totalDurationMs: totalDuration,
      totalDurationSeconds: (totalDuration / 1000).toFixed(2),
      stageTimings: {
        scraping: `${(stageTimings.scraping / 1000).toFixed(2)}s`,
        componentsAndModels: `${(stageTimings.componentsAndModels / 1000).toFixed(2)}s`,
        mapping: `${(stageTimings.mapping / 1000).toFixed(2)}s`,
        export: `${(stageTimings.export / 1000).toFixed(2)}s`,
      },
      stageTimingsMs: stageTimings,
      results: {
        componentCount: components.length,
        modelCount: models.length,
        mappingCount: mappings.length,
      },
      cached: false,
      timestamp: new Date().toISOString(),
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Background analysis completed", {
      location: "app/api/analyze/route.ts:analyzeInBackground:complete",
      jobId,
      componentCount: components.length,
      modelCount: models.length,
      mappingCount: mappings.length,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion
  } catch (error) {
    // Calculate total duration even on error
    const totalDuration = Date.now() - startTime;

    // Log performance metrics for failed analysis
    console.log("[PERF] Analysis failed", {
      url,
      jobId,
      totalDurationMs: totalDuration,
      totalDurationSeconds: (totalDuration / 1000).toFixed(2),
      stageTimings: stageTimings,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });

    // #region agent log
    console.error("[DEBUG] Analyze API: Background analysis error", {
      location: "app/api/analyze/route.ts:analyzeInBackground:error",
      jobId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    jobStore.updateJob(jobId, {
      status: 'error',
      progress: 0,
      stage: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    await analyzer.scraper.close();
    throw error;
  }
}
