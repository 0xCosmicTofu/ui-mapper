import { z } from "zod";

// Content Model Types
export const ContentFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "array", "object", "image", "url"]),
  description: z.string().optional(),
});

export const ContentModelSchema = z.object({
  name: z.string(),
  fields: z.array(ContentFieldSchema),
  description: z.string().optional(),
});

// UI Component Types
export const ComponentSlotSchema = z.object({
  name: z.string(),
  selector: z.string(),
  type: z.enum(["text", "image", "link", "array", "object"]),
  description: z.string().optional(),
});

export const UIComponentSchema = z.object({
  name: z.string(),
  selector: z.string(),
  slots: z.array(ComponentSlotSchema),
  variants: z.array(z.string()).optional(),
  description: z.string().optional(),
});

// Mapping Types
export const ComponentMappingSchema = z.object({
  componentName: z.string(),
  slotMappings: z.record(z.string(), z.string()), // slotName -> modelFieldPath
});

export const PageMappingSchema = z.object({
  pageName: z.string(),
  componentMappings: z.array(ComponentMappingSchema),
});

// Complete Analysis Result
export const AnalysisResultSchema = z.object({
  contentModels: z.array(ContentModelSchema),
  uiComponents: z.array(UIComponentSchema),
  mappings: z.array(PageMappingSchema),
  metadata: z.object({
    url: z.string(),
    timestamp: z.string(),
    screenshotPath: z.string().optional(),
  }),
});

// Webflow Export Types
export const WebflowCollectionSchema = z.object({
  name: z.string(),
  slug: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      slug: z.string(),
    })
  ),
});

export const WebflowSymbolSchema = z.object({
  name: z.string(),
  componentName: z.string(),
  bindings: z.record(z.string(), z.string()), // slotName -> collectionFieldPath
});

export const WebflowExportSchema = z.object({
  collections: z.array(WebflowCollectionSchema),
  symbols: z.array(WebflowSymbolSchema),
  pages: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
      symbolInstances: z.array(
        z.object({
          symbolName: z.string(),
          collectionBinding: z.string().optional(),
        })
      ),
    })
  ),
  csvData: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))).optional(),
});

// Type exports
export type ContentField = z.infer<typeof ContentFieldSchema>;
export type ContentModel = z.infer<typeof ContentModelSchema>;
export type ComponentSlot = z.infer<typeof ComponentSlotSchema>;
export type UIComponent = z.infer<typeof UIComponentSchema>;
export type ComponentMapping = z.infer<typeof ComponentMappingSchema>;
export type PageMapping = z.infer<typeof PageMappingSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type WebflowCollection = z.infer<typeof WebflowCollectionSchema>;
export type WebflowSymbol = z.infer<typeof WebflowSymbolSchema>;
export type WebflowExport = z.infer<typeof WebflowExportSchema>;
