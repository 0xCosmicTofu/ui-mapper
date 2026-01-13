import OpenAI from "openai";
import type { ContentModel, UIComponent } from "../types";
import { getEnv } from "../utils/env";

export class ContentModeler {
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

  async extractContentModels(
    html: string,
    components: UIComponent[]
  ): Promise<ContentModel[]> {
    const prompt = `Extract semantic content models from this HTML and components.

HTML:
\`\`\`html
${html.substring(0, 50000)}
\`\`\`

Components:
${JSON.stringify(components, null, 2)}

Extract content models (data structures) that populate these components.

For each model, provide:
- name: Model name (PascalCase, singular)
- fields: Array of {name, type, description}
- description: Brief description

Types: string, number, boolean, array, object, image, url

Output JSON array:
[{"name":"Event","fields":[{"name":"title","type":"string","description":"Event title"}],"description":"Event data"}]

Focus on main content entities and fields mapping to component slots. Return ONLY valid JSON.`;

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
      // Handle both {models: [...]} and [...] formats
      const models = Array.isArray(parsed) ? parsed : (parsed.models || []);
      return models as ContentModel[];
    } catch (parseError) {
      console.error("Failed to parse content models JSON:", parseError);
      console.error("Raw response:", jsonText);
      console.error("Cleaned JSON attempt:", cleanedJson.substring(0, 1000));
      throw new Error(
        `Failed to parse content models from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
