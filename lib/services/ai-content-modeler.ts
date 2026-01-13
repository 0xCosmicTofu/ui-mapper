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
    this.openai = new OpenAI({
      apiKey: veniceKey,
      baseURL: "https://api.venice.ai/v1",
    });

    // Use Venice model ID or default to claude-opus-4.5 (note: dot, not dash)
    const modelId = getEnv("VENICE_MODEL_ID");
    this.modelId = modelId || "claude-opus-4.5";
  }

  async extractContentModels(
    html: string,
    components: UIComponent[]
  ): Promise<ContentModel[]> {
    const prompt = `**Stage 2: Content Modeling**

You are analyzing a webpage to extract semantic content models that represent the data structure.

HTML Structure:
\`\`\`html
${html.substring(0, 50000)}
\`\`\`

Detected Components:
${JSON.stringify(components, null, 2)}

From the HTML and components, extract semantic content models. A content model represents the data structure that would populate these components.

Examples:
- Event model: {title: string, stats: array, speakers: array}
- Product model: {name: string, price: number, images: array}
- Article model: {title: string, content: string, author: string, date: string}

For each model, identify:
1. Model name (singular, PascalCase)
2. Fields with types (string, number, boolean, array, object, image, url)
3. Field descriptions

Output a JSON array with this exact structure:
[
  {
    "name": "Event",
    "fields": [
      {"name": "title", "type": "string", "description": "Event title"},
      {"name": "stats", "type": "array", "description": "Array of statistics"},
      {"name": "speakers", "type": "array", "description": "Array of speaker objects"}
    ],
    "description": "Main event data model"
  }
]

Focus on:
- Models that represent the main content entities
- Fields that map to component slots
- Arrays for repeating content (speakers, stats, items)

Return ONLY valid JSON, no markdown formatting.`;

    const response = await this.openai.chat.completions.create({
      model: this.modelId,
      max_tokens: 4000,
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
    const cleanedJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const parsed = JSON.parse(cleanedJson);
      // Handle both {models: [...]} and [...] formats
      const models = Array.isArray(parsed) ? parsed : (parsed.models || []);
      return models as ContentModel[];
    } catch (parseError) {
      console.error("Failed to parse content models JSON:", parseError);
      console.error("Raw response:", jsonText);
      throw new Error(
        `Failed to parse content models from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
