import Anthropic from "@anthropic-ai/sdk";
import type { ContentModel, UIComponent, PageMapping } from "../types";

export class MappingService {
  private anthropic: Anthropic;

  constructor() {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY is required");
    }

    this.anthropic = new Anthropic({
      apiKey: anthropicKey,
    });
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

    const response = await this.anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const jsonText = content.text.trim();
    const cleanedJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const mappings = JSON.parse(cleanedJson) as PageMapping[];
      return mappings;
    } catch (parseError) {
      console.error("Failed to parse mappings JSON:", parseError);
      console.error("Raw response:", jsonText);
      throw new Error(
        `Failed to parse mappings from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
