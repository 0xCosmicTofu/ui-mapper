import { chromium, type Browser } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

export interface ScrapeResult {
  html: string;
  screenshotPath: string;
  url: string;
  title: string;
}

export class WebScraper {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      });
    }
  }

  async scrape(url: string): Promise<ScrapeResult> {
    if (!this.browser) {
      await this.initialize();
    }

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

      return {
        html,
        screenshotPath: relativeScreenshotPath,
        url,
        title,
      };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
