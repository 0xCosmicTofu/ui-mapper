import { WebScraper } from "./scraper";
import { ComponentDetector } from "./ai-component-detector";
import { ContentModeler } from "./ai-content-modeler";
import { MappingService } from "./ai-mapper";
import { WebflowExporter } from "./webflow-exporter";
import type { AnalysisResult, WebflowExport } from "../types";

export class SiteAnalyzer {
  public scraper: WebScraper;
  public componentDetector: ComponentDetector;
  public contentModeler: ContentModeler;
  public mappingService: MappingService;
  public webflowExporter: WebflowExporter;

  constructor() {
    // #region agent log
    console.log("[DEBUG] SiteAnalyzer: Constructor called", {
      location: "lib/services/analyzer.ts:constructor",
      hasProcessEnv: typeof process !== 'undefined' && !!process.env,
      veniceKeyExists: 'VENICE_API_KEY' in (process.env || {}),
      veniceKeyValue: process.env.VENICE_API_KEY ? `${process.env.VENICE_API_KEY.substring(0, 10)}...` : 'undefined',
      allVeniceKeys: Object.keys(process.env || {}).filter(k => k.toUpperCase().includes('VENICE')),
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      hypothesisId: "F",
    });
    // #endregion
    
    this.scraper = new WebScraper();
    
    // #region agent log
    console.log("[DEBUG] SiteAnalyzer: About to create ComponentDetector", {
      location: "lib/services/analyzer.ts:constructor:beforeComponentDetector",
      veniceKeyExists: 'VENICE_API_KEY' in (process.env || {}),
      timestamp: new Date().toISOString(),
      hypothesisId: "F",
    });
    // #endregion
    
    try {
      this.componentDetector = new ComponentDetector();
    } catch (error) {
      // #region agent log
      console.error("[DEBUG] SiteAnalyzer: ComponentDetector creation failed", {
        location: "lib/services/analyzer.ts:constructor:componentDetectorError",
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        veniceKeyExists: 'VENICE_API_KEY' in (process.env || {}),
        veniceKeyValue: process.env.VENICE_API_KEY ? 'exists' : 'missing',
        timestamp: new Date().toISOString(),
        hypothesisId: "F",
      });
      // #endregion
      throw error;
    }
    
    this.contentModeler = new ContentModeler();
    this.mappingService = new MappingService();
    this.webflowExporter = new WebflowExporter();
  }

  async analyze(url: string): Promise<{
    analysis: AnalysisResult;
    webflowExport: WebflowExport;
  }> {
    // #region agent log
    console.log("[DEBUG] SiteAnalyzer: Starting analysis", {
      location: "lib/services/analyzer.ts:analyze",
      url,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    try {
      // Step 1: Scrape the site
      console.log("Step 1: Scraping site...");
      // #region agent log
      console.log("[DEBUG] SiteAnalyzer: Calling scraper", {
        location: "lib/services/analyzer.ts:analyze:scrape",
        url,
        timestamp: new Date().toISOString(),
        hypothesisId: "E",
      });
      // #endregion
      
      const scrapeResult = await this.scraper.scrape(url);
      
      // #region agent log
      console.log("[DEBUG] SiteAnalyzer: Scrape completed", {
        location: "lib/services/analyzer.ts:analyze:scrapeSuccess",
        url,
        htmlLength: scrapeResult.html.length,
        hasScreenshot: !!scrapeResult.screenshotPath,
        screenshotPath: scrapeResult.screenshotPath,
        title: scrapeResult.title,
        timestamp: new Date().toISOString(),
        hypothesisId: "E",
      });
      // #endregion

      // Step 2: Detect components
      console.log("Step 2: Detecting components...");
      const components = await this.componentDetector.detectComponents(
        scrapeResult.html,
        scrapeResult.screenshotPath
      );

      // Step 3: Extract content models
      console.log("Step 3: Extracting content models...");
      const models = await this.contentModeler.extractContentModels(
        scrapeResult.html,
        components
      );

      // Step 4: Create mappings
      console.log("Step 4: Creating mappings...");
      const mappings = await this.mappingService.createMappings(
        models,
        components,
        "Homepage"
      );

      // Step 5: Generate Webflow export
      console.log("Step 5: Generating Webflow export...");
      const webflowExport = this.webflowExporter.exportToWebflow(
        models,
        components,
        mappings
      );

      // Generate CSV data
      webflowExport.csvData = this.webflowExporter.generateCSVData(models);

      const analysis: AnalysisResult = {
        contentModels: models,
        uiComponents: components,
        mappings,
        metadata: {
          url,
          timestamp: new Date().toISOString(),
          screenshotPath: scrapeResult.screenshotPath,
        },
      };

      return {
        analysis,
        webflowExport,
      };
    } finally {
      await this.scraper.close();
    }
  }
}
