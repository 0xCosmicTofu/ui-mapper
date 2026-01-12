import axios from "axios";

export interface ScrapeResult {
  html: string;
  screenshotPath: string;
  url: string;
  title: string;
}

export class WebScraper {
  async scrape(url: string): Promise<ScrapeResult> {
    // #region agent log
    console.log("[DEBUG] WebScraper: Starting scrape with axios", {
      location: "lib/services/scraper.ts:scrape",
      url,
      timestamp: new Date().toISOString(),
      hypothesisId: "F",
    });
    // #endregion

    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      const html = response.data;
      
      // Extract title from HTML
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled";

      // #region agent log
      console.log("[DEBUG] WebScraper: Scrape completed successfully", {
        location: "lib/services/scraper.ts:scrape:success",
        url,
        htmlLength: html.length,
        title,
        timestamp: new Date().toISOString(),
        hypothesisId: "F",
      });
      // #endregion

      return {
        html,
        screenshotPath: "", // Screenshots not available with axios (would require Playwright)
        url,
        title,
      };
    } catch (error) {
      // #region agent log
      console.error("[DEBUG] WebScraper: Scrape failed", {
        location: "lib/services/scraper.ts:scrape:error",
        url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        hypothesisId: "F",
      });
      // #endregion
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    // No-op: axios doesn't require cleanup
    // #region agent log
    console.log("[DEBUG] WebScraper: close() called (no-op for axios)", {
      location: "lib/services/scraper.ts:close",
      timestamp: new Date().toISOString(),
      hypothesisId: "F",
    });
    // #endregion
  }
}
