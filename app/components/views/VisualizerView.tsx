"use client";

import { MappingGraph } from "@/app/components/MappingGraph";
import type { ContentModel, UIComponent, PageMapping } from "@/lib/mock-data";

interface VisualizerViewProps {
  models: ContentModel[];
  components: UIComponent[];
  mappings: PageMapping[];
}

export function VisualizerView({ models, components, mappings }: VisualizerViewProps) {
  return (
    <div className="h-full w-full p-4">
      <div className="h-full w-full rounded-lg border bg-muted/20 overflow-hidden">
        <MappingGraph
          models={models}
          components={components}
          mappings={mappings}
        />
      </div>
    </div>
  );
}
