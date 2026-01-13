import OpenAI from "openai";
import type { ContentModel, UIComponent, PageMapping } from "../types";
import { getEnv } from "../utils/env";

export class MappingService {
  private openai: OpenAI;
  private modelId: string;

  constructor() {
    const veniceKey = getEnv("VENICE_API_KEY");
    if (!veniceKey) {
      throw new Error("VENICE_API_KEY is required");
    }

    // Venice AI provides OpenAI-compatible API
    // Base URL per Venice documentation: https://api.venice.ai/api/v1
    // Note: Venice uses /api/v1, not /v1
    this.openai = new OpenAI({
      apiKey: veniceKey,
      baseURL: "https://api.venice.ai/api/v1",
    });

    // Use Venice model ID or default to claude-opus-45
    this.modelId = getEnv("VENICE_MODEL_ID", "claude-opus-45");
  }

  async createMappings(
    models: ContentModel[],
    components: UIComponent[],
    pageName: string = "Homepage"
  ): Promise<PageMapping[]> {
    const prompt = `Create mappings between content models and UI component slots.

Models:
${JSON.stringify(models, null, 2)}

Components:
${JSON.stringify(components, null, 2)}

Map component slots to model field paths using dot notation (e.g., "Event.title", "Event.stats[]").

Output JSON array:
[{"pageName":"Homepage","componentMappings":[{"componentName":"HeroBanner","slotMappings":{"title":"Event.title"}}]}]

Map all slots logically. Return ONLY valid JSON.`;

    const response = await this.openai.chat.completions.create({
      model: this.modelId,
      max_tokens: 2500, // Reduced from 4000 for faster responses
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from Venice AI");
    }

    const jsonText = content.trim();

    // Extract JSON from markdown code blocks (improved extraction)
    let cleanedJson = jsonText;

    // Try to extract content between ```json and ``` markers
    const codeBlockMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanedJson = codeBlockMatch[1].trim();
    } else {
      // Fallback: remove markdown code block markers if present
      cleanedJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      // If there's still extra content after the JSON, try to extract just the JSON
      // Find the first complete JSON array or object
      const jsonArrayMatch = cleanedJson.match(/^(\[[\s\S]*\])/);
      const jsonObjectMatch = cleanedJson.match(/^(\{[\s\S]*\})/);
      
      if (jsonArrayMatch) {
        cleanedJson = jsonArrayMatch[1];
      } else if (jsonObjectMatch) {
        cleanedJson = jsonObjectMatch[1];
      }
    }
    
    try {
      const parsed = JSON.parse(cleanedJson);
      // Handle both {mappings: [...]} and [...] formats
      const mappings = Array.isArray(parsed) ? parsed : (parsed.mappings || []);
      return mappings as PageMapping[];
    } catch (parseError) {
      console.error("Failed to parse mappings JSON:", parseError);
      console.error("Raw response:", jsonText);
      console.error("Cleaned JSON attempt:", cleanedJson.substring(0, 1000));
      throw new Error(
        `Failed to parse mappings from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
