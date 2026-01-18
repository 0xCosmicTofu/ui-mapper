import axios from "axios";
import { createHmac } from "crypto";
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
   * If secret key is provided, the URL is signed with HMAC-SHA256
   */
  private generateScreenshotUrl(targetUrl: string): string | null {
    if (!this.screenshotOneAccessKey) {
      return null;
    }

    // Build the query parameters (order matters for signature)
    const params: Record<string, string> = {
      access_key: this.screenshotOneAccessKey,
      url: targetUrl,
      viewport_width: "1280",
      viewport_height: "800",
      device_scale_factor: "1",
      format: "webp",
      full_page: "true",
      block_ads: "true",
      block_cookie_banners: "true",
      block_chats: "true",
      cache: "true",
      cache_ttl: "86400",
    };

    // Build query string
    const queryString = new URLSearchParams(params).toString();

    // If secret key is provided, sign the request
    if (this.screenshotOneSecretKey) {
      const signature = createHmac("sha256", this.screenshotOneSecretKey)
        .update(queryString)
        .digest("hex");
      
      return `https://api.screenshotone.com/take?${queryString}&signature=${signature}`;
    }

    return `https://api.screenshotone.com/take?${queryString}`;
  }

  async scrape(url: string): Promise<ScrapeResult> {
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 30000,
      });

      const rawHtml = response.data as string;
      const html = preprocessHTML(rawHtml, 50000);
      
      const titleMatch = rawHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "Untitled";

      const screenshotPath = this.generateScreenshotUrl(url) || "";

      return {
        html,
        screenshotPath,
        url,
        title,
      };
    } catch (error) {
      throw new Error(`Failed to scrape URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    // No-op: axios doesn't require cleanup
  }
}
