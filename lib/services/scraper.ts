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
    // #region agent log
    console.log("[SCREENSHOT-DEBUG] generateScreenshotUrl called", {
      targetUrl,
      hasAccessKey: !!this.screenshotOneAccessKey,
      accessKeyLength: this.screenshotOneAccessKey?.length || 0,
      hasSecretKey: !!this.screenshotOneSecretKey,
      secretKeyLength: this.screenshotOneSecretKey?.length || 0,
    });
    // #endregion

    if (!this.screenshotOneAccessKey) {
      console.log("[SCREENSHOT] ScreenshotOne access key not configured, skipping screenshot");
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
      block_ads: "true",
      block_cookie_banners: "true",
      block_chats: "true",
      cache: "true",
      cache_ttl: "86400", // 24 hours
    };

    // Build query string
    const queryString = new URLSearchParams(params).toString();

    // #region agent log
    console.log("[SCREENSHOT-DEBUG] Query string built", {
      queryStringLength: queryString.length,
      queryStringPreview: queryString.substring(0, 100) + "...",
    });
    // #endregion

    // If secret key is provided, sign the request
    if (this.screenshotOneSecretKey) {
      const signature = createHmac("sha256", this.screenshotOneSecretKey)
        .update(queryString)
        .digest("hex");
      
      const signedUrl = `https://api.screenshotone.com/take?${queryString}&signature=${signature}`;
      
      // #region agent log
      console.log("[SCREENSHOT-DEBUG] Signed URL generated", {
        signatureLength: signature.length,
        signaturePreview: signature.substring(0, 16) + "...",
        fullUrlLength: signedUrl.length,
        urlPreview: signedUrl.substring(0, 150) + "...",
      });
      // #endregion
      
      return signedUrl;
    }

    const unsignedUrl = `https://api.screenshotone.com/take?${queryString}`;
    
    // #region agent log
    console.log("[SCREENSHOT-DEBUG] Unsigned URL generated", {
      fullUrlLength: unsignedUrl.length,
      urlPreview: unsignedUrl.substring(0, 150) + "...",
    });
    // #endregion

    // Without secret key, return unsigned URL (less secure but still works)
    return unsignedUrl;
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

      // #region agent log
      console.log("[SCREENSHOT-DEBUG] Final screenshotPath", {
        screenshotPath: screenshotPath || "(empty)",
        screenshotPathLength: screenshotPath.length,
        startsWithHttps: screenshotPath.startsWith("https://"),
        containsScreenshotOne: screenshotPath.includes("screenshotone"),
      });
      // #endregion

      console.log("[SCRAPER] Scrape completed", {
        url,
        rawHtmlLength: rawHtml.length,
        processedHtmlLength: html.length,
        title,
        hasScreenshot: !!screenshotPath,
        isSigned: !!this.screenshotOneSecretKey,
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
