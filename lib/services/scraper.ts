import axios from "axios";
import { preprocessHTML } from "../utils/html-preprocessor";

export interface ScrapeResult {
  html: string;
  screenshotPath: string;
  url: string;
  title: string;
}

export class WebScraper {
  private screenshotOneAccessKey: string | null;
  private screenshotOneSecretKey: string | null;

  constructor() {
    this.screenshotOneAccessKey = process.env.SCREENSHOTONE_ACCESS_KEY || null;
    this.screenshotOneSecretKey = process.env.SCREENSHOTONE_SECRET_KEY || null;
  }

  /**
   * Generate a signed ScreenshotOne URL
   */
  private generateScreenshotUrl(targetUrl: string): string | null {
    if (!this.screenshotOneAccessKey) {
      console.log("[SCREENSHOT] ScreenshotOne access key not configured, skipping screenshot");
      return null;
    }

    // Build the ScreenshotOne API URL
    // Using query parameters for simplicity (no signature required for basic usage)
    const params = new URLSearchParams({
      access_key: this.screenshotOneAccessKey,
      url: targetUrl,
      viewport_width: "1280",
      viewport_height: "800",
      device_scale_factor: "1",
      format: "webp",
      block_ads: "true",
      block_cookie_banners: "true",
      block_chats: "true",
      cache: "true",
      cache_ttl: "86400", // 24 hours
    });

    return `https://api.screenshotone.com/take?${params.toString()}`;
  }

  async scrape(url: string): Promise<ScrapeResult> {
    console.log("[SCRAPER] Starting scrape", { url });

    try {
      // Fetch HTML content
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 30000,
      });

      const rawHtml = response.data as string;

      // Preprocess HTML to reduce size and improve AI processing speed
      const html = preprocessHTML(rawHtml, 50000);
      
      // Extract title from HTML (before preprocessing to ensure we get it)
      const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled";

      // Generate screenshot URL using ScreenshotOne
      const screenshotPath = this.generateScreenshotUrl(url) || "";

      console.log("[SCRAPER] Scrape completed", {
        url,
        rawHtmlLength: rawHtml.length,
        processedHtmlLength: html.length,
        title,
        hasScreenshot: !!screenshotPath,
      });

      return {
        html,
        screenshotPath,
        url,
        title,
      };
    } catch (error) {
      console.error("[SCRAPER] Scrape failed", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    // No-op: axios doesn't require cleanup
  }
}
