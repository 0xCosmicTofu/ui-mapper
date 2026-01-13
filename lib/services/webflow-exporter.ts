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
            
            // Validate modelPath is a string
            if (typeof modelPath !== "string") {
              console.warn("[WARN] WebflowExporter: modelPath is not a string, skipping", {
                location: "lib/services/webflow-exporter.ts:exportToWebflow:invalidModelPath",
                slotName,
                modelPath,
                modelPathType: typeof modelPath,
                timestamp: new Date().toISOString(),
                hypothesisId: "V",
              });
              return; // Skip this mapping
            }
            
            // Extract model and field from path (e.g., "Event.title" -> "Event", "title")
            const [modelName, ...fieldPath] = modelPath.split(".");
            const fieldName = fieldPath.join(".").replace(/\[\d*\]/g, ""); // Remove array indices
            
            const collection = collections.find((c) => c.name === modelName);
            if (collection) {
              const field = collection.fields.find((f) => f.name === fieldName);
              if (field) {
                bindings[slotName] = `${collection.slug}.${field.slug}`;
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
      // #region agent log
      console.log("[DEBUG] WebflowExporter: Processing path in findPrimaryCollection", {
        location: "lib/services/webflow-exporter.ts:findPrimaryCollectionForComponent:path",
        path,
        pathType: typeof path,
        pathIsString: typeof path === "string",
        timestamp: new Date().toISOString(),
        hypothesisId: "V",
      });
      // #endregion
      
      // Validate path is a string
      if (typeof path !== "string") {
        console.warn("[WARN] WebflowExporter: path is not a string, skipping", {
          location: "lib/services/webflow-exporter.ts:findPrimaryCollectionForComponent:invalidPath",
          path,
          pathType: typeof path,
          timestamp: new Date().toISOString(),
          hypothesisId: "V",
        });
        return; // Skip this path
      }
      
      const [modelName] = path.split(".");
      const collection = collections.find((c) => c.name === modelName);
      if (collection) {
        collectionCounts[collection.slug] = (collectionCounts[collection.slug] || 0) + 1;
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
