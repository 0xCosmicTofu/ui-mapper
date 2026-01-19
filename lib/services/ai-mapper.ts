import OpenAI from "openai";
import type { ContentModel, UIComponent, PageMapping } from "../types";
import { getEnv } from "../utils/env";

export class MappingService {
  private openai: OpenAI;
  private modelId: string;

  constructor() {
    const veniceKey = getEnv("VENICE_API_KEY");
    if (!veniceKey) {
      const errorMessage = process.env.VENICE_API_KEY 
        ? `VENICE_API_KEY is set but appears to be empty or invalid (length: ${process.env.VENICE_API_KEY.length}). Please check Vercel environment variables.`
        : `VENICE_API_KEY is not set. Please configure it in Vercel Dashboard → Settings → Environment Variables for ${process.env.VERCEL_ENV || 'preview'} deployments.`;
      throw new Error(errorMessage);
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

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-mapper.ts:62',message:'AI response metadata',data:{finishReason:response.choices[0]?.finish_reason,hasContent:!!response.choices[0]?.message?.content,contentLength:response.choices[0]?.message?.content?.length,model:response.model},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from Venice AI");
    }

    const jsonText = content.trim();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-mapper.ts:75',message:'Raw JSON text',data:{length:jsonText.length,first500:jsonText.substring(0,500),last500:jsonText.substring(Math.max(0,jsonText.length-500))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D,E'})}).catch(()=>{});
    // #endregion

    // Extract JSON from markdown code blocks (improved extraction)
    let cleanedJson = jsonText;
    let extractionMethod = 'none';

    // Try to extract content between ```json and ``` markers
    const codeBlockMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      cleanedJson = codeBlockMatch[1].trim();
      extractionMethod = 'codeBlockMatch';
    } else {
      // Fallback: remove markdown code block markers if present
      cleanedJson = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
      // If there's still extra content after the JSON, try to extract just the JSON
      // Find the first complete JSON array or object
      const jsonArrayMatch = cleanedJson.match(/^(\[[\s\S]*\])/);
      const jsonObjectMatch = cleanedJson.match(/^(\{[\s\S]*\})/);
      
      if (jsonArrayMatch) {
        cleanedJson = jsonArrayMatch[1];
        extractionMethod = 'jsonArrayMatch';
      } else if (jsonObjectMatch) {
        cleanedJson = jsonObjectMatch[1];
        extractionMethod = 'jsonObjectMatch';
      } else {
        extractionMethod = 'fallbackClean';
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-mapper.ts:105',message:'After JSON extraction',data:{extractionMethod,cleanedLength:cleanedJson.length,rawLength:jsonText.length,endsWithBracket:cleanedJson.endsWith(']')||cleanedJson.endsWith('}'),last100:cleanedJson.substring(Math.max(0,cleanedJson.length-100))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    try {
      const parsed = JSON.parse(cleanedJson);
      // Handle both {mappings: [...]} and [...] formats
      const mappings = Array.isArray(parsed) ? parsed : (parsed.mappings || []);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-mapper.ts:115',message:'Parse success',data:{mappingsCount:mappings.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'success'})}).catch(()=>{});
      // #endregion
      return mappings as PageMapping[];
    } catch (parseError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cefeb5be-19ce-47e2-aae9-b6a86c063e28',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-mapper.ts:120',message:'Parse FAILED',data:{error:parseError instanceof Error ? parseError.message : String(parseError),cleanedLength:cleanedJson.length,endsWithBracket:cleanedJson.endsWith(']')||cleanedJson.endsWith('}'),charAtError:cleanedJson.substring(7780,7810)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C,D,E'})}).catch(()=>{});
      // #endregion
      console.error("Failed to parse mappings JSON:", parseError);
      console.error("Raw response:", jsonText);
      console.error("Cleaned JSON attempt:", cleanedJson.substring(0, 1000));
      throw new Error(
        `Failed to parse mappings from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
    }
  }
}
