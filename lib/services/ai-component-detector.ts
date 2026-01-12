import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";
import type { UIComponent } from "../types";

export class ComponentDetector {
  private anthropic: Anthropic;
  private openai: OpenAI | null = null;

  constructor() {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is required");
    }

    this.anthropic = new Anthropic({
      apiKey: anthropicKey,
    });

    // Only initialize OpenAI if key is provided (optional fallback)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
    }
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
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: screenshotBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Claude");
      }

      // Parse JSON response
      const jsonText = content.text.trim();
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
      console.error("Error detecting components with Claude:", error);
      
      // Only try GPT-4V fallback if OpenAI is configured
      if (this.openai) {
        console.log("Falling back to GPT-4V for component detection...");
        try {
          return await this.detectComponentsWithGPT4V(html, screenshotBase64);
        } catch (fallbackError) {
          console.error("GPT-4V fallback also failed:", fallbackError);
          throw new Error(
            `Component detection failed with both Claude and GPT-4V. Claude error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      
      // Re-throw if no fallback available
      throw new Error(
        `Component detection failed with Claude. ${error instanceof Error ? error.message : String(error)}. ${!this.openai ? "OpenAI API key not configured, so no fallback available." : ""}`
      );
    }
  }

  private async detectComponentsWithGPT4V(
    html: string,
    screenshotBase64: string
  ): Promise<UIComponent[]> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured. Cannot use GPT-4V fallback.");
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this webpage and identify reusable UI components. HTML: ${html.substring(0, 10000)}. Return JSON array of components with name, selector, and slots.`,
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
      throw new Error("No response from GPT-4V");
    }

    try {
      const parsed = JSON.parse(content);
      return parsed.components || [];
    } catch (parseError) {
      console.error("Failed to parse GPT-4V response JSON:", parseError);
      console.error("Raw response:", content);
      throw new Error(
        `Failed to parse components from GPT-4V response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
