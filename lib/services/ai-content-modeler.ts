import OpenAI from "openai";
import type { ContentModel, UIComponent } from "../types";

/**
 * Venice AI Model Configuration
 * 
 * For text-only tasks (content modeling), we use Claude Opus 4.5.
 * 
 * Model ID format: claude-opus-45 (no dot, no "4.5")
 * To override, set VENICE_MODEL_ID in .env file
 */
const DEFAULT_VENICE_TEXT_MODEL = "claude-opus-45";

export class ContentModeler {
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
    this.modelId = process.env.VENICE_MODEL_ID || DEFAULT_VENICE_TEXT_MODEL;
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
      model: this.modelId, // Model ID defined in constructor (default: claude-opus-45)
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from Venice API");
    }

    const jsonText = content.trim();
    const cleanedJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const models = JSON.parse(cleanedJson) as ContentModel[];
      return models;
    } catch (parseError) {
      console.error("Failed to parse content models JSON:", parseError);
      console.error("Raw response:", jsonText);
      throw new Error(
        `Failed to parse content models from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
