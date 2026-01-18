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
    console.log("[SCREENSHOT] generateScreenshotUrl called", {
      targetUrl,
      hasAccessKey: !!this.screenshotOneAccessKey,
      accessKeyLength: this.screenshotOneAccessKey?.length || 0,
      hasSecretKey: !!this.screenshotOneSecretKey,
      secretKeyLength: this.screenshotOneSecretKey?.length || 0,
    });
    // #endregion

    if (!this.screenshotOneAccessKey) {
      // #region agent log
      console.log("[SCREENSHOT] No access key - skipping screenshot");
      // #endregion
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
      full_page: "true", // Capture the entire page, not just viewport
      block_ads: "true",
      block_cookie_banners: "true",
      block_chats: "true",
      cache: "true",
      cache_ttl: "86400", // 24 hours
    };

    // Build query string
    const queryString = new URLSearchParams(params).toString();

    // If secret key is provided, sign the request
    if (this.screenshotOneSecretKey) {
      const signature = createHmac("sha256", this.screenshotOneSecretKey)
        .update(queryString)
        .digest("hex");
      
      const signedUrl = `https://api.screenshotone.com/take?${queryString}&signature=${signature}`;
      
      // #region agent log
      console.log("[SCREENSHOT] Generated signed URL", {
        signatureLength: signature.length,
        urlLength: signedUrl.length,
      });
      // #endregion
      
      return signedUrl;
    }

    const unsignedUrl = `https://api.screenshotone.com/take?${queryString}`;
    
    // #region agent log
    console.log("[SCREENSHOT] Generated unsigned URL", {
      urlLength: unsignedUrl.length,
    });
    // #endregion

    // Without secret key, return unsigned URL (less secure but still works)
    return unsignedUrl;
  }

  async scrape(url: string): Promise<ScrapeResult> {
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
      console.log("[SCREENSHOT] Final scrape result", {
        screenshotPath: screenshotPath ? screenshotPath.substring(0, 100) + "..." : "(empty)",
        hasScreenshot: !!screenshotPath,
      });
      // #endregion

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
