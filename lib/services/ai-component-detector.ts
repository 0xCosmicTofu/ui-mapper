import OpenAI from "openai";
import { readFile } from "fs/promises";
import { join } from "path";
import type { UIComponent } from "../types";
import { getEnv } from "../utils/env";
import axios from "axios";

export class ComponentDetector {
  private openai: OpenAI;
  private modelId: string;

  constructor() {
    const rawVeniceKey = getEnv("VENICE_API_KEY");
    // Clean API key - remove any "VENICE_API_KEY=" prefix if accidentally included
    // Also remove any trailing newlines, carriage returns, or whitespace
    let veniceKey = rawVeniceKey.replace(/^VENICE_API_KEY\s*=\s*/i, "").trim();
    // Remove trailing newlines and carriage returns (common in Vercel env vars)
    veniceKey = veniceKey.replace(/[\n\r]+$/, "").trim();
    
    // #region agent log
    console.log("[DEBUG] ComponentDetector: API key cleaning", {
      location: "lib/services/ai-component-detector.ts:constructor:apiKeyClean",
      rawKeyLength: rawVeniceKey.length,
      cleanedKeyLength: veniceKey.length,
      rawKeyPrefix: rawVeniceKey.substring(0, 20),
      cleanedKeyPrefix: veniceKey.substring(0, 20),
      rawKeyLastChars: rawVeniceKey.split('').slice(-5).map(c => c.charCodeAt(0)),
      cleanedKeyLastChars: veniceKey.split('').slice(-5).map(c => c.charCodeAt(0)),
      hasTrailingNewline: rawVeniceKey.endsWith('\n') || rawVeniceKey.endsWith('\r'),
      timestamp: new Date().toISOString(),
      hypothesisId: "R",
    });
    // #endregion
    
    if (!veniceKey) {
      throw new Error("VENICE_API_KEY is required");
    }

    // Venice AI provides OpenAI-compatible API
    // Base URL per Venice documentation: https://api.venice.ai/api/v1
    // Note: Venice uses /api/v1, not /v1
    const baseURL = getEnv("VENICE_API_BASE_URL", "https://api.venice.ai/api/v1");
    this.openai = new OpenAI({
      apiKey: veniceKey,
      baseURL: baseURL,
      // Add timeout to help diagnose connection issues
      timeout: 60000,
    });

    // Use Venice model ID or default to claude-opus-45
    // getEnv already trims, but let's be extra safe and trim again
    const rawModelId = getEnv("VENICE_MODEL_ID");
    this.modelId = (rawModelId || "claude-opus-45").trim();
    
    // Check for hidden characters (newlines, carriage returns, etc.)
    const hasNewline = this.modelId.includes('\n');
    const hasCarriageReturn = this.modelId.includes('\r');
    const hasWhitespace = /\s/.test(this.modelId);
    
    // #region agent log
    console.log("[DEBUG] ComponentDetector: Constructor initialized", {
      location: "lib/services/ai-component-detector.ts:constructor",
      modelId: this.modelId,
      rawModelIdFromEnv: rawModelId,
      hasModelIdEnvVar: !!rawModelId,
      modelIdLength: this.modelId.length,
      modelIdCharCodes: this.modelId.split('').map(c => c.charCodeAt(0)).slice(0, 20),
      hasNewline: hasNewline,
      hasCarriageReturn: hasCarriageReturn,
      hasWhitespace: hasWhitespace,
      modelIdJSON: JSON.stringify(this.modelId), // Shows hidden chars
      baseURL: this.openai.baseURL,
      hasApiKey: !!veniceKey,
      apiKeyLength: veniceKey.length,
      apiKeyPrefix: veniceKey.substring(0, 10),
      timestamp: new Date().toISOString(),
      hypothesisId: "I",
    });
    // #endregion
    
    // Warn if we detect hidden characters
    if (hasNewline || hasCarriageReturn || hasWhitespace) {
      console.warn("[WARN] ComponentDetector: Model ID contains whitespace/newlines!", {
        location: "lib/services/ai-component-detector.ts:constructor:warning",
        modelId: this.modelId,
        modelIdJSON: JSON.stringify(this.modelId),
        hasNewline,
        hasCarriageReturn,
        hasWhitespace,
        timestamp: new Date().toISOString(),
        hypothesisId: "I",
      });
    }
  }

  async detectComponents(
    html: string,
    screenshotPath: string
  ): Promise<UIComponent[]> {
    // #region agent log
    console.log("[DEBUG] ComponentDetector: Starting component detection", {
      location: "lib/services/ai-component-detector.ts:detectComponents",
      htmlLength: html.length,
      hasScreenshot: !!screenshotPath,
      screenshotPath,
      timestamp: new Date().toISOString(),
      hypothesisId: "E",
    });
    // #endregion

    let screenshotBase64: string | null = null;
    
    // Try to read screenshot if available
    if (screenshotPath) {
      try {
    const screenshotFullPath = join(process.cwd(), "public", screenshotPath);
    const screenshotBuffer = await readFile(screenshotFullPath);
        screenshotBase64 = screenshotBuffer.toString("base64");
        // #region agent log
        console.log("[DEBUG] ComponentDetector: Screenshot loaded", {
          location: "lib/services/ai-component-detector.ts:detectComponents:screenshot",
          screenshotSize: screenshotBuffer.length,
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
      } catch (error) {
        // #region agent log
        console.warn("[DEBUG] ComponentDetector: Screenshot not available, continuing without it", {
          location: "lib/services/ai-component-detector.ts:detectComponents:screenshotError",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
      }
    }

    // Use Claude Vision for component detection (with or without screenshot)
    const prompt = screenshotBase64
      ? `**Stage 1: Component Detection**

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

Return ONLY valid JSON, no markdown formatting.`
      : `**Stage 1: Component Detection**

You are analyzing a webpage to identify reusable UI components. 

HTML Structure:
\`\`\`html
${html.substring(0, 50000)} // Truncate if too long
\`\`\`

Analyze the HTML structure to identify 5-10 reusable components. For each component, identify:
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
      // Venice AI uses OpenAI-compatible API with vision support (if screenshot available)
      // Build content array with proper types for OpenAI SDK
      const messageContent: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [
        {
          type: "text",
          text: prompt,
        },
      ];

      // Add screenshot if available
      if (screenshotBase64) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${screenshotBase64}`,
          },
        });
      }

      // Build the request payload
      const requestPayload = {
        model: this.modelId,
        max_tokens: 4000,
        messages: [
          {
            role: "user" as const,
            content: messageContent,
          },
        ],
        response_format: { type: "json_object" as const },
      };

      // #region agent log
      const rawApiKey = getEnv("VENICE_API_KEY");
      // Clean API key - remove any "VENICE_API_KEY=" prefix if accidentally included
      const cleanApiKey = rawApiKey.replace(/^VENICE_API_KEY\s*=\s*/i, "").trim();
      const fullUrl = `${this.openai.baseURL}/chat/completions`;
      console.log("[DEBUG] ComponentDetector: Sending request to Venice AI", {
        location: "lib/services/ai-component-detector.ts:detectComponents:request",
        model: this.modelId,
        modelLength: this.modelId.length,
        modelCharCodes: this.modelId.split('').map(c => c.charCodeAt(0)).slice(0, 20),
        baseURL: this.openai.baseURL,
        fullRequestUrl: fullUrl,
        expectedEndpoint: `${this.openai.baseURL}/chat/completions`,
        requestPayload: JSON.stringify(requestPayload).substring(0, 1000),
        requestPayloadSize: JSON.stringify(requestPayload).length,
        hasScreenshot: !!screenshotBase64,
        messageContentLength: messageContent.length,
        messageContentTypes: messageContent.map(m => m.type),
        hasApiKey: !!cleanApiKey,
        apiKeyLength: cleanApiKey.length,
        apiKeyPrefix: cleanApiKey.substring(0, 15) || "none",
        apiKeyFormat: cleanApiKey.startsWith("VENICE-") ? "VENICE- prefix" : cleanApiKey.startsWith("sk-") ? "sk- prefix" : "other",
        rawApiKeyPrefix: rawApiKey.substring(0, 20),
        timestamp: new Date().toISOString(),
        hypothesisId: "J",
      });
      // #endregion

      // Try OpenAI SDK first, but also prepare for direct HTTP fallback if needed
      let response;
      console.log("[DEBUG] ComponentDetector: About to make OpenAI SDK request", {
        location: "lib/services/ai-component-detector.ts:detectComponents:preRequest",
        model: this.modelId,
        baseURL: this.openai.baseURL,
        apiKeyLength: cleanApiKey.length,
        apiKeyPrefix: cleanApiKey.substring(0, 20),
        apiKeySuffix: cleanApiKey.substring(cleanApiKey.length - 10),
        apiKeyFormat: cleanApiKey.startsWith("VENICE-") ? "VENICE- prefix" : cleanApiKey.startsWith("sk-") ? "sk- prefix" : "other",
        expectedAuthHeader: `Bearer ${cleanApiKey.substring(0, 20)}...`,
        timestamp: new Date().toISOString(),
        hypothesisId: "S",
      });
      // #endregion
      
      try {
        response = await this.openai.chat.completions.create(requestPayload);
      } catch (sdkError: any) {
        // OpenAI SDK error structure: error.status (not error.response.status)
        const errorStatus = sdkError?.status || sdkError?.response?.status;
        
        // #region agent log
        console.error("[DEBUG] ComponentDetector: OpenAI SDK request failed, attempting direct HTTP", {
          location: "lib/services/ai-component-detector.ts:detectComponents:sdkError",
          sdkError: sdkError instanceof Error ? sdkError.message : String(sdkError),
          sdkErrorStatus: errorStatus,
          sdkErrorStatusDirect: sdkError?.status,
          sdkErrorResponseStatus: sdkError?.response?.status,
          sdkErrorData: sdkError?.response?.data || sdkError?.error,
          sdkErrorKeys: Object.keys(sdkError || {}),
          timestamp: new Date().toISOString(),
          hypothesisId: "K",
        });
        // #endregion
        
        // Handle 401 authentication errors - try direct HTTP with exact same model
        if (errorStatus === 401) {
          // #region agent log
          // cleanApiKey is already declared above, reuse it
          console.error("[DEBUG] ComponentDetector: 401 Authentication failed", {
            location: "lib/services/ai-component-detector.ts:detectComponents:401Error",
            errorStatus,
            apiKeyLength: cleanApiKey.length,
            apiKeyPrefix: cleanApiKey.substring(0, 20),
            apiKeySuffix: cleanApiKey.substring(cleanApiKey.length - 10),
            apiKeyFormat: cleanApiKey.startsWith("VENICE-") ? "VENICE- prefix" : cleanApiKey.startsWith("sk-") ? "sk- prefix" : "other",
            hasTrailingNewline: cleanApiKey.endsWith('\n') || cleanApiKey.endsWith('\r'),
            apiKeyCharCodes: cleanApiKey.split('').map(c => c.charCodeAt(0)).slice(-5), // Last 5 chars
            apiKeyJSON: JSON.stringify(cleanApiKey.substring(0, 30)), // First 30 chars as JSON to show hidden chars
            baseURL: this.openai.baseURL,
            model: this.modelId,
            timestamp: new Date().toISOString(),
            hypothesisId: "Q",
          });
          // #endregion
          
          // First, try to list models to verify API key works at all
          const modelsUrl = `${this.openai.baseURL}/models`;
          const fullUrl = `${this.openai.baseURL}/chat/completions`;
          
          try {
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Testing API key with models endpoint", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401TestModels",
              url: modelsUrl,
              timestamp: new Date().toISOString(),
              hypothesisId: "U",
            });
            // #endregion
            
            const modelsTestResponse = await axios.get(modelsUrl, {
              headers: {
                "Authorization": `Bearer ${cleanApiKey}`,
                "Content-Type": "application/json",
              },
              timeout: 10000,
              validateStatus: (status) => status < 500,
            });
            
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Models endpoint test response", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401ModelsTestResponse",
              status: modelsTestResponse.status,
              hasData: !!modelsTestResponse.data,
              dataKeys: modelsTestResponse.data ? Object.keys(modelsTestResponse.data) : [],
              availableModels: modelsTestResponse.data?.data?.map((m: any) => m.id) || [],
              responseHeaders: {
                'cf-ray': modelsTestResponse.headers['cf-ray'],
                'x-ratelimit-remaining': modelsTestResponse.headers['x-ratelimit-remaining'],
                'x-venice-balance-usd': modelsTestResponse.headers['x-venice-balance-usd'],
                'x-venice-balance-diem': modelsTestResponse.headers['x-venice-balance-diem'],
              },
              timestamp: new Date().toISOString(),
              hypothesisId: "U",
            });
            // #endregion
            
            if (modelsTestResponse.status === 200) {
              // API key works for models endpoint, so issue is likely model-specific or subscription
              console.warn("[WARN] ComponentDetector: API key works for models endpoint but fails for chat/completions", {
                location: "lib/services/ai-component-detector.ts:detectComponents:401ModelOrSubscriptionIssue",
                requestedModel: this.modelId,
                availableModels: modelsTestResponse.data?.data?.map((m: any) => m.id) || [],
                balanceUsd: modelsTestResponse.headers['x-venice-balance-usd'],
                balanceDiem: modelsTestResponse.headers['x-venice-balance-diem'],
                timestamp: new Date().toISOString(),
                hypothesisId: "U",
              });
            }
          } catch (modelsTestError: any) {
            // #region agent log
            console.error("[DEBUG] ComponentDetector: Models endpoint test also failed", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401ModelsTestError",
              error: modelsTestError instanceof Error ? modelsTestError.message : String(modelsTestError),
              status: modelsTestError?.response?.status,
              responseData: modelsTestError?.response?.data,
              timestamp: new Date().toISOString(),
              hypothesisId: "U",
            });
            // #endregion
          }
          
          // Try direct HTTP request with exact same model to see if it's an SDK issue
          try {
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Attempting direct HTTP with claude-opus-45", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttp",
              url: fullUrl,
              model: this.modelId,
              authHeaderFormat: `Bearer ${cleanApiKey.substring(0, 20)}...`,
              requestPayloadKeys: Object.keys(requestPayload),
              requestPayloadModel: requestPayload.model,
              requestPayloadHasResponseFormat: !!requestPayload.response_format,
              timestamp: new Date().toISOString(),
              hypothesisId: "S",
            });
            // #endregion
            
            // Try without response_format first (Venice docs mention it can cause issues)
            const payloadWithoutFormat = {
              ...requestPayload,
              response_format: undefined,
            };
            delete (payloadWithoutFormat as any).response_format;
            
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Trying without response_format first", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttpNoFormat",
              payloadKeys: Object.keys(payloadWithoutFormat),
              timestamp: new Date().toISOString(),
              hypothesisId: "S",
            });
            // #endregion
            
            // Log the exact Authorization header being sent
            const authHeader = `Bearer ${cleanApiKey}`;
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Exact Authorization header being sent", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401AuthHeader",
              authHeaderLength: authHeader.length,
              authHeaderPrefix: authHeader.substring(0, 30),
              authHeaderSuffix: authHeader.substring(authHeader.length - 15),
              authHeaderCharCodes: authHeader.split('').map(c => c.charCodeAt(0)).slice(0, 30),
              cleanApiKeyLength: cleanApiKey.length,
              cleanApiKeyPrefix: cleanApiKey.substring(0, 20),
              cleanApiKeySuffix: cleanApiKey.substring(cleanApiKey.length - 10),
              timestamp: new Date().toISOString(),
              hypothesisId: "T",
            });
            // #endregion
            
            let httpResponse = await axios.post(
              fullUrl,
              payloadWithoutFormat,
              {
                headers: {
                  "Authorization": authHeader,
                  "Content-Type": "application/json",
                },
                timeout: 60000,
                validateStatus: (status) => status < 500,
              }
            );
            
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Direct HTTP response (401 handler, no format)", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttpResponse",
              status: httpResponse.status,
              statusText: httpResponse.statusText,
              responseHeaders: {
                'cf-ray': httpResponse.headers['cf-ray'],
                'x-ratelimit-remaining': httpResponse.headers['x-ratelimit-remaining'],
                'x-venice-balance-usd': httpResponse.headers['x-venice-balance-usd'],
                'x-venice-balance-diem': httpResponse.headers['x-venice-balance-diem'],
              },
              dataPreview: JSON.stringify(httpResponse.data).substring(0, 500),
              timestamp: new Date().toISOString(),
              hypothesisId: "S",
            });
            // #endregion
            
            if (httpResponse.status === 200 && httpResponse.data) {
              // #region agent log
              console.log("[DEBUG] ComponentDetector: Direct HTTP succeeded without response_format!", {
                location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttpSuccess",
                model: this.modelId,
                cfRay: httpResponse.headers['cf-ray'],
                timestamp: new Date().toISOString(),
                hypothesisId: "S",
              });
              // #endregion
              
              // Convert axios response to OpenAI SDK format
              const responseData = httpResponse.data as any;
              response = {
                choices: [
                  {
                    message: {
                      content: responseData.choices?.[0]?.message?.content || JSON.stringify(responseData),
                    },
                  },
                ],
              } as any;
            } else if (httpResponse.status === 401) {
              // Still 401, try with response_format
              // #region agent log
              console.log("[DEBUG] ComponentDetector: Still 401, trying with response_format", {
                location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttpWithFormat",
                timestamp: new Date().toISOString(),
                hypothesisId: "S",
              });
              // #endregion
              
              httpResponse = await axios.post(
                fullUrl,
                requestPayload, // Original with response_format
                {
                  headers: {
                    "Authorization": `Bearer ${cleanApiKey}`,
                    "Content-Type": "application/json",
                  },
                  timeout: 60000,
                  validateStatus: (status) => status < 500,
                }
              );
              
              // #region agent log
              console.log("[DEBUG] ComponentDetector: Direct HTTP response (with format)", {
                location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttpResponseFormat",
                status: httpResponse.status,
                cfRay: httpResponse.headers['cf-ray'],
                timestamp: new Date().toISOString(),
                hypothesisId: "S",
              });
              // #endregion
              
              if (httpResponse.status === 200 && httpResponse.data) {
                response = {
                  choices: [
                    {
                      message: {
                        content: httpResponse.data.choices?.[0]?.message?.content || JSON.stringify(httpResponse.data),
                      },
                    },
                  ],
                } as any;
              }
            } else {
              // #region agent log
              console.error("[DEBUG] ComponentDetector: Direct HTTP also returned non-200", {
                location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttpNon200",
                status: httpResponse.status,
                data: httpResponse.data,
                timestamp: new Date().toISOString(),
                hypothesisId: "S",
              });
              // #endregion
            }
          } catch (httpError: any) {
            // #region agent log
            console.error("[DEBUG] ComponentDetector: Direct HTTP request failed (401 handler)", {
              location: "lib/services/ai-component-detector.ts:detectComponents:401DirectHttpError",
              error: httpError instanceof Error ? httpError.message : String(httpError),
              status: httpError?.response?.status,
              statusText: httpError?.response?.statusText,
              responseData: httpError?.response?.data,
              responseHeaders: httpError?.response?.headers,
              timestamp: new Date().toISOString(),
              hypothesisId: "S",
            });
            // #endregion
          }
          
          // If we got a response from direct HTTP, use it; otherwise throw the original error
          if (!response) {
            throw sdkError;
          }
        }
        
        // If SDK fails with 404, try to list available models first, then try direct HTTP
        if (errorStatus === 404) {
          // #region agent log
          console.log("[DEBUG] ComponentDetector: 404 detected, entering fallback handler", {
            location: "lib/services/ai-component-detector.ts:detectComponents:404Handler",
            errorStatus,
            modelId: this.modelId,
            modelIdLength: this.modelId.length,
            modelIdJSON: JSON.stringify(this.modelId),
            timestamp: new Date().toISOString(),
            hypothesisId: "O",
          });
          // #endregion
          
          // Clean API key - remove any "VENICE_API_KEY=" prefix if accidentally included
          const rawApiKey = getEnv("VENICE_API_KEY");
          const cleanApiKey = rawApiKey.replace(/^VENICE_API_KEY\s*=\s*/i, "").trim();
          const fullUrl = `${this.openai.baseURL}/chat/completions`;
          const modelsUrl = `${this.openai.baseURL}/models`;
          
          // First, try to list available models to see what's actually available
          try {
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Attempting to list available models", {
              location: "lib/services/ai-component-detector.ts:detectComponents:listModels",
              url: modelsUrl,
              timestamp: new Date().toISOString(),
              hypothesisId: "M",
            });
            // #endregion
            
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Models request details", {
              location: "lib/services/ai-component-detector.ts:detectComponents:modelsRequest",
              url: modelsUrl,
              authHeaderPrefix: `Bearer ${cleanApiKey.substring(0, 20)}...`,
              apiKeyLength: cleanApiKey.length,
              apiKeyStartsWith: cleanApiKey.substring(0, 10),
              timestamp: new Date().toISOString(),
              hypothesisId: "P",
            });
            // #endregion
            
            const modelsResponse = await axios.get(modelsUrl, {
              headers: {
                "Authorization": `Bearer ${cleanApiKey}`,
                "Content-Type": "application/json",
              },
              timeout: 10000,
              validateStatus: (status) => status < 500,
            });
            
            // #region agent log
            console.log("[DEBUG] ComponentDetector: Available models response", {
              location: "lib/services/ai-component-detector.ts:detectComponents:modelsResponse",
              status: modelsResponse.status,
              data: modelsResponse.data,
              timestamp: new Date().toISOString(),
              hypothesisId: "M",
            });
            // #endregion
          } catch (modelsError: any) {
            // #region agent log
            console.warn("[DEBUG] ComponentDetector: Failed to list models (non-critical)", {
              location: "lib/services/ai-component-detector.ts:detectComponents:modelsError",
              error: modelsError instanceof Error ? modelsError.message : String(modelsError),
              status: modelsError?.response?.status,
              timestamp: new Date().toISOString(),
              hypothesisId: "M",
            });
            // #endregion
          }
          
          // Try alternative model names
          const alternativeModels = [
            "claude-opus-4.5",  // With dot
            "claude-3-opus-20240229",  // Full Claude 3 format
            "claude-3-5-sonnet-20241022",  // Claude 3.5 format
            "gpt-4",  // Fallback to GPT-4 if available
          ];
          
          let lastError = sdkError;
          for (const altModel of alternativeModels) {
            try {
              // #region agent log
              console.log("[DEBUG] ComponentDetector: Trying alternative model", {
                location: "lib/services/ai-component-detector.ts:detectComponents:tryAltModel",
                model: altModel,
                timestamp: new Date().toISOString(),
                hypothesisId: "N",
              });
              // #endregion
              
              const altPayload = { ...requestPayload, model: altModel };
              const httpResponse = await axios.post(
                fullUrl,
                altPayload,
                {
                  headers: {
                    "Authorization": `Bearer ${cleanApiKey}`,
                    "Content-Type": "application/json",
                  },
                  timeout: 60000,
                  validateStatus: (status) => status < 500,
                }
              );
              
              if (httpResponse.status === 200 && httpResponse.data) {
                // #region agent log
                console.log("[DEBUG] ComponentDetector: Alternative model worked!", {
                  location: "lib/services/ai-component-detector.ts:detectComponents:altModelSuccess",
                  model: altModel,
                  timestamp: new Date().toISOString(),
                  hypothesisId: "N",
                });
                // #endregion
                
                // Convert axios response to OpenAI SDK format
                response = {
                  choices: [
                    {
                      message: {
                        content: httpResponse.data.choices?.[0]?.message?.content || JSON.stringify(httpResponse.data),
                      },
                    },
                  ],
                } as any;
                break; // Success! Exit the loop
              } else {
                // #region agent log
                console.log("[DEBUG] ComponentDetector: Alternative model also failed", {
                  location: "lib/services/ai-component-detector.ts:detectComponents:altModelFailed",
                  model: altModel,
                  status: httpResponse.status,
                  response: httpResponse.data,
                  timestamp: new Date().toISOString(),
                  hypothesisId: "N",
                });
                // #endregion
              }
            } catch (altError: any) {
              // #region agent log
              console.log("[DEBUG] ComponentDetector: Alternative model error", {
                location: "lib/services/ai-component-detector.ts:detectComponents:altModelError",
                model: altModel,
                error: altError instanceof Error ? altError.message : String(altError),
                status: altError?.response?.status,
                timestamp: new Date().toISOString(),
                hypothesisId: "N",
              });
              // #endregion
              lastError = altError;
            }
          }
          
          // If we got a response from an alternative model, use it
          if (response) {
            // Success - response is already set
          } else {
            // All models failed, try original with direct HTTP for final logging
            try {
              // #region agent log
              console.log("[DEBUG] ComponentDetector: Attempting direct HTTP with original model", {
                location: "lib/services/ai-component-detector.ts:detectComponents:directHttp",
                url: fullUrl,
                method: "POST",
                model: this.modelId,
                timestamp: new Date().toISOString(),
                hypothesisId: "K",
              });
              // #endregion
              
              const httpResponse = await axios.post(
                fullUrl,
                requestPayload,
                {
                  headers: {
                    "Authorization": `Bearer ${cleanApiKey}`,
                    "Content-Type": "application/json",
                  },
                  timeout: 60000,
                  validateStatus: (status) => status < 500,
                }
              );
              
              // #region agent log
              console.log("[DEBUG] ComponentDetector: Direct HTTP response", {
                location: "lib/services/ai-component-detector.ts:detectComponents:directHttpResponse",
                status: httpResponse.status,
                statusText: httpResponse.statusText,
                dataFull: httpResponse.data,
                timestamp: new Date().toISOString(),
                hypothesisId: "K",
              });
              // #endregion
              
              if (httpResponse.status === 200 && httpResponse.data) {
                response = {
                  choices: [
                    {
                      message: {
                        content: httpResponse.data.choices?.[0]?.message?.content || JSON.stringify(httpResponse.data),
                      },
                    },
                  ],
                } as any;
              }
            } catch (httpError: any) {
              // #region agent log
              console.error("[DEBUG] ComponentDetector: Direct HTTP request also failed", {
                location: "lib/services/ai-component-detector.ts:detectComponents:directHttpError",
                error: httpError instanceof Error ? httpError.message : String(httpError),
                status: httpError?.response?.status,
                responseData: httpError?.response?.data,
                timestamp: new Date().toISOString(),
                hypothesisId: "K",
              });
              // #endregion
            }
            
            // If we still don't have a response, throw the original error
            if (!response) {
              throw sdkError;
            }
          }
        } else {
          throw sdkError; // Re-throw if not 404
        }
      }

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
        
        // #region agent log
        console.log("[DEBUG] ComponentDetector: Successfully parsed components", {
          location: "lib/services/ai-component-detector.ts:detectComponents:success",
          componentCount: components.length,
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
        
        return components as UIComponent[];
      } catch (parseError) {
        // #region agent log
        console.error("[DEBUG] ComponentDetector: Failed to parse JSON", {
          location: "lib/services/ai-component-detector.ts:detectComponents:parseError",
          error: parseError instanceof Error ? parseError.message : String(parseError),
          rawResponse: jsonText.substring(0, 500),
          timestamp: new Date().toISOString(),
          hypothesisId: "E",
        });
        // #endregion
        
        console.error("Failed to parse components JSON:", parseError);
        console.error("Raw response:", jsonText);
        throw new Error(
          `Failed to parse components from AI response. ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }
    } catch (error) {
      // #region agent log
      let errorDetails: any = {
        location: "lib/services/ai-component-detector.ts:detectComponents:error",
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : typeof error,
        timestamp: new Date().toISOString(),
        hypothesisId: "I",
      };

      // Log all error properties to see structure
      if (error && typeof error === 'object') {
        errorDetails.errorKeys = Object.keys(error);
        errorDetails.errorProperties = {};
        for (const key in error) {
          try {
            const value = (error as any)[key];
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              errorDetails.errorProperties[key] = value;
            } else if (value === null || value === undefined) {
              errorDetails.errorProperties[key] = value;
            } else {
              errorDetails.errorProperties[key] = `[${typeof value}]`;
            }
          } catch (e) {
            errorDetails.errorProperties[key] = '[error accessing]';
          }
        }
      }

      // Extract more details from OpenAI SDK errors
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as any).response;
        errorDetails.responseStatus = response?.status;
        errorDetails.responseStatusText = response?.statusText;
        errorDetails.responseData = response?.data;
        errorDetails.responseDataType = typeof response?.data;
        
        // Try to parse response data to get Venice AI's error message
        if (response?.data !== undefined && response?.data !== null) {
          try {
            if (typeof response.data === 'string') {
              errorDetails.responseDataString = response.data;
              try {
                errorDetails.responseDataParsed = JSON.parse(response.data);
              } catch (e) {
                errorDetails.responseDataRaw = response.data;
              }
            } else if (typeof response.data === 'object') {
              errorDetails.responseDataString = JSON.stringify(response.data);
              errorDetails.responseDataParsed = response.data;
            } else {
              errorDetails.responseDataString = String(response.data);
            }
          } catch (e) {
            errorDetails.responseDataParseError = e instanceof Error ? e.message : String(e);
          }
        }
        
        errorDetails.responseHeaders = response?.headers ? Object.fromEntries(response.headers.entries()) : null;
      }
      
      // Also check if error has a 'body' property (some SDKs put response data there)
      if (error && typeof error === 'object' && 'body' in error) {
        try {
          errorDetails.errorBody = typeof (error as any).body === 'string' 
            ? (error as any).body 
            : JSON.stringify((error as any).body);
        } catch (e) {
          // Ignore
        }
      }

      // Extract request details if available
      if (error && typeof error === 'object' && 'request' in error) {
        const request = (error as any).request;
        errorDetails.requestUrl = request?.url;
        errorDetails.requestMethod = request?.method;
        errorDetails.requestHeaders = request?.headers ? Object.fromEntries(request.headers.entries()) : null;
      }

      // Log model and baseURL for debugging
      errorDetails.modelId = this.modelId;
      errorDetails.modelIdLength = this.modelId.length;
      errorDetails.modelIdCharCodes = this.modelId.split('').map(c => c.charCodeAt(0));
      errorDetails.baseURL = this.openai.baseURL;
      errorDetails.expectedEndpoint = `${this.openai.baseURL}/chat/completions`;
      errorDetails.hasApiKey = !!getEnv("VENICE_API_KEY");
      errorDetails.apiKeyLength = getEnv("VENICE_API_KEY").length;
      errorDetails.rawModelId = JSON.stringify(this.modelId);

      console.error("[DEBUG] ComponentDetector: Component detection failed", errorDetails);
      // #endregion
      
      console.error("Error detecting components with Venice AI:", error);
      
      // Provide more detailed error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      const statusCode = (error as any)?.response?.status;
      const statusText = (error as any)?.response?.statusText;
      
      throw new Error(
        `Component detection failed. ${errorMessage}${statusCode ? ` (${statusCode} ${statusText || ''})` : ''}`
      );
    }
  }

}
