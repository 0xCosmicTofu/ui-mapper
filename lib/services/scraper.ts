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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:23',message:'scrape() called',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:30',message:'page created, setting up network monitoring',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Track network activity
    let networkRequestCount = 0;
    let networkResponseCount = 0;
    let lastNetworkActivity = Date.now();
    
    page.on('request', () => {
      networkRequestCount++;
      lastNetworkActivity = Date.now();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:40',message:'network request',data:{count:networkRequestCount,timeSinceLast:Date.now()-lastNetworkActivity},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    });
    
    page.on('response', () => {
      networkResponseCount++;
      lastNetworkActivity = Date.now();
    });
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:52',message:'starting page.goto()',data:{url,waitUntil:'load',timeout:45000},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Navigate to the page
      // Use "load" instead of "networkidle" to avoid timeout on sites with continuous network activity
      const startTime = Date.now();
      await page.goto(url, {
        waitUntil: "load",
        timeout: 45000,
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:66',message:'page.goto() succeeded',data:{url,elapsed:Date.now()-startTime,requests:networkRequestCount,responses:networkResponseCount},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:72',message:'waiting 3s for dynamic content',data:{requests:networkRequestCount,responses:networkResponseCount},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Wait for dynamic content to load (increased from 2s to 3s for better content capture)
      await page.waitForTimeout(3000);

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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:81',message:'scrape() completed successfully',data:{url,title,htmlLength:html.length,requests:networkRequestCount,responses:networkResponseCount},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return {
        html,
        screenshotPath: relativeScreenshotPath,
        url,
        title,
      };
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'scraper.ts:113',message:'scrape() error caught',data:{url,error:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown',requests:networkRequestCount,responses:networkResponseCount,timeSinceLastActivity:Date.now()-lastNetworkActivity},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
      // #endregion
      throw error;
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
