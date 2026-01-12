import OpenAI from "openai";
import type { ContentModel, UIComponent, PageMapping } from "../types";

export class MappingService {
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
    // Trim whitespace/newlines that might come from environment variables
    this.modelId = (process.env.VENICE_MODEL_ID || "claude-opus-45").trim();
  }

  async createMappings(
    models: ContentModel[],
    components: UIComponent[],
    pageName: string = "Homepage"
  ): Promise<PageMapping[]> {
    const prompt = `**Stage 3: Explicit Mapping**

You are creating explicit mappings between content models and UI component slots.

Content Models:
${JSON.stringify(models, null, 2)}

UI Components:
${JSON.stringify(components, null, 2)}

Create mappings that connect model fields to component slots. For each component used on the page, map its slots to model field paths.

Mapping format:
- Component slot → Model field path
- Use dot notation for nested fields (e.g., "Event.stats[0]")
- Use array notation for array items (e.g., "Event.speakers[]")

Output a JSON array with this exact structure:
[
  {
    "pageName": "Homepage",
    "componentMappings": [
      {
        "componentName": "HeroBanner",
        "slotMappings": {
          "title": "Event.title",
          "primary_stat": "Event.stats[0]",
          "cta": "Event.cta_link"
        }
      },
      {
        "componentName": "StatsGrid",
        "slotMappings": {
          "items": "Event.stats[]"
        }
      }
    ]
  }
]

Focus on:
- Logical connections between models and components
- All slots should be mapped
- Use array notation for repeating content
- Consider the page structure and hierarchy

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
      // Handle both {mappings: [...]} and [...] formats
      const mappings = Array.isArray(parsed) ? parsed : (parsed.mappings || []);
      return mappings as PageMapping[];
    } catch (parseError) {
      console.error("Failed to parse mappings JSON:", parseError);
      console.error("Raw response:", jsonText);
      throw new Error(
        `Failed to parse mappings from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
