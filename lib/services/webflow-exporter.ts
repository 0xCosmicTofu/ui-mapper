import type {
  ContentModel,
  UIComponent,
  PageMapping,
  WebflowExport,
  WebflowCollection,
  WebflowSymbol,
} from "../types";

export class WebflowExporter {
  exportToWebflow(
    models: ContentModel[],
    components: UIComponent[],
    mappings: PageMapping[]
  ): WebflowExport {
    // #region agent log
    console.log("[DEBUG] WebflowExporter: Starting export", {
      location: "lib/services/webflow-exporter.ts:exportToWebflow:start",
      modelsCount: models.length,
      componentsCount: components.length,
      mappingsCount: mappings.length,
      mappingsStructure: mappings.map(m => ({
        pageName: m.pageName,
        componentMappingsCount: m.componentMappings?.length || 0,
        componentMappings: m.componentMappings?.map(cm => ({
          componentName: cm.componentName,
          slotMappingsKeys: Object.keys(cm.slotMappings || {}),
          slotMappingsValues: Object.values(cm.slotMappings || {}),
          slotMappingsTypes: Object.values(cm.slotMappings || {}).map(v => typeof v),
        })),
      })),
      timestamp: new Date().toISOString(),
      hypothesisId: "V",
    });
    // #endregion
    
    // Convert content models to Webflow Collections
    const collections: WebflowCollection[] = models.map((model) => ({
      name: model.name,
      slug: this.toSlug(model.name),
      fields: model.fields.map((field) => ({
        name: field.name,
        type: this.mapFieldTypeToWebflow(field.type),
        slug: this.toSlug(field.name),
      })),
    }));

    // Convert UI components to Webflow Symbols
    const symbols: WebflowSymbol[] = components.map((component) => {
      // Find mappings for this component
      const componentMapping = mappings
        .flatMap((m) => m.componentMappings)
        .find((m) => m.componentName === component.name);

      const bindings: Record<string, string> = {};
      
      if (componentMapping) {
        // #region agent log
        console.log("[DEBUG] WebflowExporter: Processing component mapping", {
          location: "lib/services/webflow-exporter.ts:exportToWebflow:componentMapping",
          componentName: component.name,
          slotMappings: componentMapping.slotMappings,
          slotMappingsType: typeof componentMapping.slotMappings,
          slotMappingsKeys: Object.keys(componentMapping.slotMappings),
          timestamp: new Date().toISOString(),
          hypothesisId: "V",
        });
        // #endregion
        
        // Map slots to collection fields
        Object.entries(componentMapping.slotMappings).forEach(
          ([slotName, modelPath]) => {
            // #region agent log
            console.log("[DEBUG] WebflowExporter: Processing slot mapping", {
              location: "lib/services/webflow-exporter.ts:exportToWebflow:slotMapping",
              slotName,
              modelPath,
              modelPathType: typeof modelPath,
              modelPathIsString: typeof modelPath === "string",
              modelPathValue: modelPath,
              timestamp: new Date().toISOString(),
              hypothesisId: "V",
            });
            // #endregion
            
            // Handle different types of modelPath
            if (typeof modelPath === "string") {
              // Handle string paths normally
              const [modelName, ...fieldPath] = modelPath.split(".");
              const fieldName = fieldPath.join(".").replace(/\[\d*\]/g, ""); // Remove array indices
              
              const collection = collections.find((c) => c.name === modelName);
              if (collection) {
                const field = collection.fields.find((f) => f.name === fieldName);
                if (field) {
                  bindings[slotName] = `${collection.slug}.${field.slug}`;
                }
              }
            } else if (modelPath === null || modelPath === undefined) {
              // Null/undefined means static/unmapped slot - this is expected, log at debug level
              // #region agent log
              console.log("[DEBUG] WebflowExporter: Slot is static/unmapped (expected)", {
                location: "lib/services/webflow-exporter.ts:exportToWebflow:staticSlot",
                slotName,
                timestamp: new Date().toISOString(),
                hypothesisId: "V",
              });
              // #endregion
              // Don't create binding for static slots
            } else if (typeof modelPath === "object" && modelPath !== null) {
              // Handle complex objects - extract primary field
              const obj = modelPath as Record<string, unknown>;
              
              // Try to find a primary field (prefer label, then src, then first string value)
              let primaryPath: string | null = null;
              
              if (typeof obj.label === "string") {
                primaryPath = obj.label;
              } else if (typeof obj.src === "string") {
                primaryPath = obj.src;
              } else {
                // Find first string value
                for (const [key, value] of Object.entries(obj)) {
                  if (typeof value === "string") {
                    primaryPath = value;
                    break;
                  }
                }
              }
              
              if (primaryPath) {
                // Extract model and field from path
                const [modelName, ...fieldPath] = primaryPath.split(".");
                const fieldName = fieldPath.join(".").replace(/\[\d*\]/g, "");
                
                const collection = collections.find((c) => c.name === modelName);
                if (collection) {
                  const field = collection.fields.find((f) => f.name === fieldName);
                  if (field) {
                    bindings[slotName] = `${collection.slug}.${field.slug}`;
                    
                    // #region agent log
                    console.log("[DEBUG] WebflowExporter: Extracted primary field from complex object", {
                      location: "lib/services/webflow-exporter.ts:exportToWebflow:complexObject",
                      slotName,
                      primaryPath,
                      extractedField: fieldName,
                      timestamp: new Date().toISOString(),
                      hypothesisId: "V",
                    });
                    // #endregion
                  }
                }
              } else {
                // #region agent log
                console.log("[DEBUG] WebflowExporter: Complex object has no string fields to extract", {
                  location: "lib/services/webflow-exporter.ts:exportToWebflow:complexObjectNoString",
                  slotName,
                  objectKeys: Object.keys(obj),
                  timestamp: new Date().toISOString(),
                  hypothesisId: "V",
                });
                // #endregion
              }
            }
          }
        );
      }

      return {
        name: component.name,
        componentName: component.name,
        bindings,
      };
    });

    // Create pages with symbol instances
    const pages = mappings.map((mapping) => ({
      name: mapping.pageName,
      slug: this.toSlug(mapping.pageName),
      symbolInstances: mapping.componentMappings.map((cm) => ({
        symbolName: cm.componentName,
        collectionBinding: this.findPrimaryCollectionForComponent(
          cm,
          collections
        ),
      })),
    }));

    return {
      collections,
      symbols,
      pages,
    };
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private mapFieldTypeToWebflow(
    type: string
  ): string {
    const typeMap: Record<string, string> = {
      string: "PlainText",
      number: "Number",
      boolean: "Bool",
      array: "ItemReferenceSet",
      object: "ItemReference",
      image: "ImageRef",
      url: "Link",
    };
    return typeMap[type] || "PlainText";
  }

  private findPrimaryCollectionForComponent(
    componentMapping: { componentName: string; slotMappings: Record<string, string> },
    collections: WebflowCollection[]
  ): string | undefined {
    // Find the most common collection used in slot mappings
    const collectionCounts: Record<string, number> = {};
    
    Object.values(componentMapping.slotMappings).forEach((path) => {
      let pathToProcess: string | null = null;
      
      if (typeof path === "string") {
        pathToProcess = path;
      } else if (path === null || path === undefined) {
        // Skip null/undefined - these are static slots (expected)
        return;
      } else if (typeof path === "object") {
        // Extract primary field from complex objects
        const obj = path as Record<string, unknown>;
        if (typeof obj.label === "string") {
          pathToProcess = obj.label;
        } else if (typeof obj.src === "string") {
          pathToProcess = obj.src;
        } else {
          // Find first string value
          for (const value of Object.values(obj)) {
            if (typeof value === "string") {
              pathToProcess = value;
              break;
            }
          }
        }
      }
      
      if (pathToProcess) {
        // #region agent log
        console.log("[DEBUG] WebflowExporter: Processing path in findPrimaryCollection", {
          location: "lib/services/webflow-exporter.ts:findPrimaryCollectionForComponent:path",
          path: pathToProcess,
          originalPathType: typeof path,
          timestamp: new Date().toISOString(),
          hypothesisId: "V",
        });
        // #endregion
        
        const [modelName] = pathToProcess.split(".");
        const collection = collections.find((c) => c.name === modelName);
        if (collection) {
          collectionCounts[collection.slug] = (collectionCounts[collection.slug] || 0) + 1;
        }
      }
    });

    const sorted = Object.entries(collectionCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0];
  }

  generateCSVData(
    models: ContentModel[],
    sampleData?: Record<string, any>
  ): Record<string, Array<Record<string, unknown>>> {
    const csvData: Record<string, Array<Record<string, unknown>>> = {};

    models.forEach((model) => {
      const slug = this.toSlug(model.name);
      
      // Use sample data if provided, otherwise generate placeholder
      if (sampleData && sampleData[model.name]) {
        csvData[slug] = Array.isArray(sampleData[model.name])
          ? sampleData[model.name]
          : [sampleData[model.name]];
      } else {
        // Generate placeholder entry
        const entry: Record<string, unknown> = {};
        model.fields.forEach((field) => {
          entry[this.toSlug(field.name)] = this.getPlaceholderValue(field.type);
        });
        csvData[slug] = [entry];
      }
    });

    return csvData;
  }

  private getPlaceholderValue(type: string): unknown {
    switch (type) {
      case "string":
        return "Sample text";
      case "number":
        return 0;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        return {};
      case "image":
        return "https://via.placeholder.com/400";
      case "url":
        return "https://example.com";
      default:
        return "";
    }
  }
}
