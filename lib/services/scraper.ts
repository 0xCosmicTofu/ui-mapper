import { chromium, type Browser } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";
import axios from "axios";

export interface ScrapeResult {
  html: string;
  screenshotPath: string;
  url: string;
  title: string;
}

export class WebScraper {
  private browser: Browser | null = null;
  private usePlaywright: boolean = true;

  async initialize(): Promise<boolean> {
    // #region agent log
    console.log("[DEBUG] WebScraper: Attempting to initialize Playwright", {
      location: "lib/services/scraper.ts:initialize",
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    if (!this.browser && this.usePlaywright) {
      try {
        this.browser = await chromium.launch({
          headless: true,
        });
        // #region agent log
        console.log("[DEBUG] WebScraper: Playwright initialized successfully", {
          location: "lib/services/scraper.ts:initialize:success",
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
        return true;
      } catch (error) {
        // #region agent log
        console.error("[DEBUG] WebScraper: Playwright initialization failed, falling back to axios", {
          location: "lib/services/scraper.ts:initialize:error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
        this.usePlaywright = false;
        return false;
      }
    }
    return this.usePlaywright;
  }

  private async scrapeWithAxios(url: string): Promise<ScrapeResult> {
    // #region agent log
    console.log("[DEBUG] WebScraper: Using axios fallback method", {
      location: "lib/services/scraper.ts:scrapeWithAxios",
      url,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
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
      console.log("[DEBUG] WebScraper: Axios scrape completed", {
        location: "lib/services/scraper.ts:scrapeWithAxios:success",
        url,
        htmlLength: html.length,
        title,
        timestamp: new Date().toISOString(),
        hypothesisId: "E",
      });
      // #endregion

      return {
        html,
        screenshotPath: "", // No screenshot available with axios fallback
        url,
        title,
      };
    } catch (error) {
      // #region agent log
      console.error("[DEBUG] WebScraper: Axios scrape failed", {
        location: "lib/services/scraper.ts:scrapeWithAxios:error",
        url,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        hypothesisId: "E",
      });
      // #endregion
      throw new Error(`Failed to scrape URL with axios: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async scrape(url: string): Promise<ScrapeResult> {
    // Try Playwright first if not already disabled
    if (this.usePlaywright) {
      const playwrightAvailable = await this.initialize();
      
      if (playwrightAvailable && this.browser) {
        // #region agent log
        console.log("[DEBUG] WebScraper: Using Playwright method", {
          location: "lib/services/scraper.ts:scrape:playwright",
          url,
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion

        const page = await this.browser!.newPage();
        
        try {
          // Navigate to the page
          await page.goto(url, {
            waitUntil: "networkidle",
            timeout: 30000,
          });

          // Wait for content to load
          await page.waitForTimeout(2000);

          // Get page title
          const title = await page.title();

          // Get full HTML
          const html = await page.content();

          // Take screenshot
          try {
            const screenshotDir = join(process.cwd(), "public", "screenshots");
            await mkdir(screenshotDir, { recursive: true });
            
            const timestamp = Date.now();
            const screenshotFilename = `screenshot-${timestamp}.png`;
            const screenshotPath = join(screenshotDir, screenshotFilename);
            await page.screenshot({
              path: screenshotPath,
              fullPage: true,
            });

            // Return relative path for API
            const relativeScreenshotPath = `/screenshots/${screenshotFilename}`;

            // #region agent log
            console.log("[DEBUG] WebScraper: Playwright scrape completed with screenshot", {
              location: "lib/services/scraper.ts:scrape:playwright:success",
              url,
              htmlLength: html.length,
              title,
              screenshotPath: relativeScreenshotPath,
              timestamp: new Date().toISOString(),
              hypothesisId: "E",
            });
            // #endregion

            return {
              html,
              screenshotPath: relativeScreenshotPath,
              url,
              title,
            };
          } catch (screenshotError) {
            // #region agent log
            console.warn("[DEBUG] WebScraper: Screenshot failed, continuing without screenshot", {
              location: "lib/services/scraper.ts:scrape:playwright:screenshotError",
              error: screenshotError instanceof Error ? screenshotError.message : String(screenshotError),
              timestamp: new Date().toISOString(),
              hypothesisId: "E",
            });
            // #endregion

            // Continue without screenshot
            return {
              html,
              screenshotPath: "",
              url,
              title,
            };
          }
        } catch (playwrightError) {
          // #region agent log
          console.error("[DEBUG] WebScraper: Playwright scrape failed, falling back to axios", {
            location: "lib/services/scraper.ts:scrape:playwright:error",
            error: playwrightError instanceof Error ? playwrightError.message : String(playwrightError),
            timestamp: new Date().toISOString(),
            hypothesisId: "E",
          });
          // #endregion
          
          await page.close();
          this.usePlaywright = false;
          // Fall through to axios fallback
        } finally {
          await page.close();
        }
      }
    }

    // Fallback to axios if Playwright is not available or failed
    return await this.scrapeWithAxios(url);
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        // #region agent log
        console.log("[DEBUG] WebScraper: Browser closed", {
          location: "lib/services/scraper.ts:close",
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
      } catch (error) {
        // #region agent log
        console.error("[DEBUG] WebScraper: Error closing browser", {
          location: "lib/services/scraper.ts:close:error",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
      }
      this.browser = null;
    }
  }
}
