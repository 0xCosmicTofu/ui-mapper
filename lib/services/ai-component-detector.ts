import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";
import type { UIComponent } from "../types";
import { getEnv } from "../utils/env";

export class ComponentDetector {
  private openai: OpenAI;
  private modelId: string;

  constructor() {
    const veniceKey = getEnv("VENICE_API_KEY");
    if (!veniceKey) {
      throw new Error("VENICE_API_KEY is required");
    }

    // Venice AI provides OpenAI-compatible API
    this.openai = new OpenAI({
      apiKey: veniceKey,
      baseURL: "https://api.venice.ai/v1",
    });

    // Use Venice model ID or default to claude-opus-45
    this.modelId = getEnv("VENICE_MODEL_ID", "claude-opus-45");
  }

  async detectComponents(
    html: string,
    screenshotPath: string
  ): Promise<UIComponent[]> {
    // #region agent log
    console.log("[DEBUG] ComponentDetector: Starting component detection", {
      location: "lib/services/ai-component-detector.ts:detectComponents",
      htmlLength: html.length,
      hasScreenshot: !!screenshotPath,
      screenshotPath,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    let screenshotBase64: string | null = null;
    
    // Try to read screenshot if available
    if (screenshotPath) {
      try {
    const screenshotFullPath = join(process.cwd(), "public", screenshotPath);
    const screenshotBuffer = await readFile(screenshotFullPath);
        screenshotBase64 = screenshotBuffer.toString("base64");
        // #region agent log
        console.log("[DEBUG] ComponentDetector: Screenshot loaded", {
          location: "lib/services/ai-component-detector.ts:detectComponents:screenshot",
          screenshotSize: screenshotBuffer.length,
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
      } catch (error) {
        // #region agent log
        console.warn("[DEBUG] ComponentDetector: Screenshot not available, continuing without it", {
          location: "lib/services/ai-component-detector.ts:detectComponents:screenshotError",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
      }
    }

    // Use Claude Vision for component detection (with or without screenshot)
    const prompt = screenshotBase64
      ? `**Stage 1: Component Detection**

You are analyzing a webpage to identify reusable UI components. 

HTML Structure:
\`\`\`html
${html.substring(0, 50000)} // Truncate if too long
\`\`\`

Analyze the screenshot and HTML to identify 5-10 reusable components. For each component, identify:
1. Component name (e.g., "HeroBanner", "StatsGrid", "SpeakerCard")
2. CSS selector that uniquely identifies this component
3. Slots within the component (text elements, images, links, arrays of items)

Output a JSON array with this exact structure:
[
  {
    "name": "HeroBanner",
    "selector": ".hero-section",
    "slots": [
      {"name": "title", "selector": "h1.title", "type": "text"},
      {"name": "subtitle", "selector": ".subtitle", "type": "text"},
      {"name": "primary_stat", "selector": ".stat-lead", "type": "text"},
      {"name": "cta", "selector": ".cta-btn", "type": "link"}
    ],
    "variants": ["full", "teaser"],
    "description": "Main hero banner with title and CTA"
  }
]

Focus on:
- Components that appear multiple times or could be reused
- Components with clear content slots
- Components that would make sense as Webflow Symbols

Return ONLY valid JSON, no markdown formatting.`
      : `**Stage 1: Component Detection**

You are analyzing a webpage to identify reusable UI components. 

HTML Structure:
\`\`\`html
${html.substring(0, 50000)} // Truncate if too long
\`\`\`

Analyze the HTML structure to identify 5-10 reusable components. For each component, identify:
1. Component name (e.g., "HeroBanner", "StatsGrid", "SpeakerCard")
2. CSS selector that uniquely identifies this component
3. Slots within the component (text elements, images, links, arrays of items)

Output a JSON array with this exact structure:
[
  {
    "name": "HeroBanner",
    "selector": ".hero-section",
    "slots": [
      {"name": "title", "selector": "h1.title", "type": "text"},
      {"name": "subtitle", "selector": ".subtitle", "type": "text"},
      {"name": "primary_stat", "selector": ".stat-lead", "type": "text"},
      {"name": "cta", "selector": ".cta-btn", "type": "link"}
    ],
    "variants": ["full", "teaser"],
    "description": "Main hero banner with title and CTA"
  }
]

Focus on:
- Components that appear multiple times or could be reused
- Components with clear content slots
- Components that would make sense as Webflow Symbols

Return ONLY valid JSON, no markdown formatting.`;

    try {
      // Venice AI uses OpenAI-compatible API with vision support (if screenshot available)
      // Build content array with proper types for OpenAI SDK
      const messageContent: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [
        {
          type: "text",
          text: prompt,
        },
      ];

      // Add screenshot if available
      if (screenshotBase64) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${screenshotBase64}`,
          },
        });
      }

      // #region agent log
      const requestPayload = {
        model: this.modelId,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
        response_format: { type: "json_object" },
      };
      
      console.log("[DEBUG] ComponentDetector: Sending request to Venice AI", {
        location: "lib/services/ai-component-detector.ts:detectComponents:request",
        model: this.modelId,
        modelLength: this.modelId.length,
        modelCharCodes: this.modelId.split('').map(c => c.charCodeAt(0)).slice(0, 20),
        baseURL: this.openai.baseURL,
        expectedEndpoint: `${this.openai.baseURL}/chat/completions`,
        hasScreenshot: !!screenshotBase64,
        messageContentLength: messageContent.length,
        messageContentTypes: messageContent.map(m => m.type),
        hasApiKey: !!getEnv("VENICE_API_KEY"),
        apiKeyPrefix: getEnv("VENICE_API_KEY").substring(0, 10) || "none",
        requestPayload: JSON.stringify(requestPayload).substring(0, 500),
        timestamp: new Date().toISOString(),
        hypothesisId: "G",
      });
      // #endregion

      const response = await this.openai.chat.completions.create(requestPayload);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from Venice AI");
      }

      // Parse JSON response
      const jsonText = content.trim();
      // Remove markdown code blocks if present
      const cleanedJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      try {
        const parsed = JSON.parse(cleanedJson);
        // Handle both {components: [...]} and [...] formats
        const components = Array.isArray(parsed) ? parsed : (parsed.components || []);
        
        // #region agent log
        console.log("[DEBUG] ComponentDetector: Successfully parsed components", {
          location: "lib/services/ai-component-detector.ts:detectComponents:success",
          componentCount: components.length,
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
        
        return components as UIComponent[];
      } catch (parseError) {
        // #region agent log
        console.error("[DEBUG] ComponentDetector: Failed to parse JSON", {
          location: "lib/services/ai-component-detector.ts:detectComponents:parseError",
          error: parseError instanceof Error ? parseError.message : String(parseError),
          rawResponse: jsonText.substring(0, 500),
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
        
        console.error("Failed to parse components JSON:", parseError);
        console.error("Raw response:", jsonText);
        throw new Error(
          `Failed to parse components from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    } catch (error) {
      // #region agent log
      let errorDetails: any = {
        location: "lib/services/ai-component-detector.ts:detectComponents:error",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        hypothesisId: "F",
      };

      // Extract more details from OpenAI SDK errors
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response;
        errorDetails.responseStatus = response?.status;
        errorDetails.responseStatusText = response?.statusText;
        errorDetails.responseData = response?.data;
        errorDetails.responseHeaders = response?.headers;
      }

      // Extract request details if available
      if (error && typeof error === 'object' && 'request' in error) {
        const request = (error as any).request;
        errorDetails.requestUrl = request?.url;
        errorDetails.requestMethod = request?.method;
        errorDetails.requestHeaders = request?.headers;
      }

      // Log model and baseURL for debugging
      errorDetails.modelId = this.modelId;
      errorDetails.modelIdLength = this.modelId.length;
      errorDetails.modelIdCharCodes = this.modelId.split('').map(c => c.charCodeAt(0));
      errorDetails.baseURL = this.openai.baseURL;
      errorDetails.expectedEndpoint = `${this.openai.baseURL}/chat/completions`;
      errorDetails.hasApiKey = !!getEnv("VENICE_API_KEY");
      errorDetails.apiKeyLength = getEnv("VENICE_API_KEY").length;
      errorDetails.rawModelId = JSON.stringify(this.modelId);

      console.error("[DEBUG] ComponentDetector: Component detection failed", errorDetails);
      // #endregion
      
      console.error("Error detecting components with Venice AI:", error);
      
      // Provide more detailed error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = (error as any)?.response?.status;
      const statusText = (error as any)?.response?.statusText;
      
      throw new Error(
        `Component detection failed. ${errorMessage}${statusCode ? ` (${statusCode} ${statusText || ''})` : ''}`
      );
    }
  }

}
