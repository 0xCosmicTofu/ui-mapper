import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";
import type { UIComponent } from "../types";

/**
 * Venice AI Model Configuration
 * 
 * Venice supports OpenAI-compatible API. For vision tasks (component detection),
 * we use Claude Opus 4.5 which supports image inputs.
 * 
 * Model ID format: claude-opus-45 (no dot, no "4.5")
 * To override, set VENICE_MODEL_ID in .env file
 * Check Venice docs for available models: https://docs.venice.ai
 */
const DEFAULT_VENICE_VISION_MODEL = "claude-opus-45";

export class ComponentDetector {
  private openai: OpenAI;
  private modelId: string;

  constructor() {
    const veniceKey = process.env.VENICE_API_KEY;
    if (!veniceKey) {
      throw new Error("VENICE_API_KEY is required");
    }

    this.openai = new OpenAI({
      apiKey: veniceKey,
      baseURL: "https://api.venice.ai/api/v1",
    });

    // Model ID is defined here - can be overridden via .env
    this.modelId = process.env.VENICE_MODEL_ID || DEFAULT_VENICE_VISION_MODEL;
  }

  async detectComponents(
    html: string,
    screenshotPath: string
  ): Promise<UIComponent[]> {
    // Read screenshot as base64
    const screenshotFullPath = join(process.cwd(), "public", screenshotPath);
    const screenshotBuffer = await readFile(screenshotFullPath);
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Use Claude Vision for component detection
    const prompt = `**Stage 1: Component Detection**

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

Return ONLY valid JSON, no markdown formatting.`;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-component-detector.ts:72',message:'Starting component detection',data:{modelId:this.modelId,screenshotPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-component-detector.ts:76',message:'Calling Venice API',data:{modelId:this.modelId,baseURL:this.openai.baseURL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      const response = await this.openai.chat.completions.create({
        model: this.modelId, // Model ID defined in constructor (default: claude-opus-45)
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${screenshotBase64}`,
                },
              },
            ],
          },
        ],
      });
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-component-detector.ts:100',message:'Venice API response received',data:{modelId:this.modelId,hasContent:!!response.choices[0]?.message?.content},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from Venice API");
      }

      // Parse JSON response
      const jsonText = content.trim();
      // Remove markdown code blocks if present
      const cleanedJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      try {
        const components = JSON.parse(cleanedJson) as UIComponent[];
        return components;
      } catch (parseError) {
        console.error("Failed to parse components JSON:", parseError);
        console.error("Raw response:", jsonText);
        throw new Error(
          `Failed to parse components from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-component-detector.ts:120',message:'Component detection error',data:{modelId:this.modelId,error:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown',errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.error("Error detecting components with Venice API:", error);
      throw new Error(
        `Component detection failed. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
