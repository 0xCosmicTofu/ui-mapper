import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";
import type { UIComponent } from "../types";

export class ComponentDetector {
  private openai: OpenAI;
  private modelId: string;

  constructor() {
    const veniceKey = process.env.VENICE_API_KEY;
    if (!veniceKey) {
      throw new Error("VENICE_API_KEY is required");
    }

    // Venice AI provides OpenAI-compatible API
    this.openai = new OpenAI({
      apiKey: veniceKey,
      baseURL: "https://api.venice.ai/v1",
    });

    // Use Venice model ID or default to claude-opus-45
    this.modelId = process.env.VENICE_MODEL_ID || "claude-opus-45";
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

    try {
      // Venice AI uses OpenAI-compatible API with vision support
      const response = await this.openai.chat.completions.create({
        model: this.modelId,
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
        response_format: { type: "json_object" },
      });

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
        return components as UIComponent[];
      } catch (parseError) {
        console.error("Failed to parse components JSON:", parseError);
        console.error("Raw response:", jsonText);
        throw new Error(
          `Failed to parse components from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    } catch (error) {
      console.error("Error detecting components with Venice AI:", error);
      throw new Error(
        `Component detection failed. ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

}
