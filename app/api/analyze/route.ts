import { NextRequest, NextResponse } from "next/server";
import { SiteAnalyzer } from "@/lib/services/analyzer";
import { jobStore } from "@/lib/services/job-store";
import { z } from "zod";
import { randomUUID } from "crypto";

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

    // Generate job ID
    const jobId = randomUUID();

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

    const scrapeResult = await analyzer.scraper.scrape(url);

    jobStore.updateJob(jobId, {
      progress: 20,
      stage: 'scraping',
      message: `Scraped ${scrapeResult.title}`,
    });

    // Step 2: Component Detection (~23s)
    jobStore.updateJob(jobId, {
      progress: 30,
      stage: 'components',
      message: 'Detecting components...',
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Step 2 - Component Detection", {
      location: "app/api/analyze/route.ts:analyzeInBackground:components",
      jobId,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    const components = await analyzer.componentDetector.detectComponents(
      scrapeResult.html,
      scrapeResult.screenshotPath
    );

    jobStore.updateJob(jobId, {
      progress: 50,
      stage: 'components',
      message: `Found ${components.length} components`,
    });

    // Step 3: Content Modeling (~20s)
    jobStore.updateJob(jobId, {
      progress: 60,
      stage: 'models',
      message: 'Extracting content models...',
    });

    // #region agent log
    console.log("[DEBUG] Analyze API: Step 3 - Content Modeling", {
      location: "app/api/analyze/route.ts:analyzeInBackground:models",
      jobId,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    const models = await analyzer.contentModeler.extractContentModels(
      scrapeResult.html,
      components
    );

    jobStore.updateJob(jobId, {
      progress: 75,
      stage: 'models',
      message: `Extracted ${models.length} content models`,
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

    const mappings = await analyzer.mappingService.createMappings(
      models,
      components,
      "Homepage"
    );

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

    const webflowExport = analyzer.webflowExporter.exportToWebflow(
      models,
      components,
      mappings
    );

    webflowExport.csvData = analyzer.webflowExporter.generateCSVData(models);

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
