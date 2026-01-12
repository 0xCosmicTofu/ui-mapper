import { WebScraper } from "./scraper";
import { ComponentDetector } from "./ai-component-detector";
import { ContentModeler } from "./ai-content-modeler";
import { MappingService } from "./ai-mapper";
import { WebflowExporter } from "./webflow-exporter";
import type { AnalysisResult, WebflowExport } from "../types";

export class SiteAnalyzer {
  private scraper: WebScraper;
  private componentDetector: ComponentDetector;
  private contentModeler: ContentModeler;
  private mappingService: MappingService;
  private webflowExporter: WebflowExporter;

  constructor() {
    this.scraper = new WebScraper();
    this.componentDetector = new ComponentDetector();
    this.contentModeler = new ContentModeler();
    this.mappingService = new MappingService();
    this.webflowExporter = new WebflowExporter();
  }

  async analyze(url: string): Promise<{
    analysis: AnalysisResult;
    webflowExport: WebflowExport;
  }> {
    try {
      // Step 1: Scrape the site
      console.log("Step 1: Scraping site...");
      const scrapeResult = await this.scraper.scrape(url);

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
