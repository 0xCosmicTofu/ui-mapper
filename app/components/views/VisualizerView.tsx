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
    <div className="h-full w-full">
      <MappingGraph
        models={models}
        components={components}
        mappings={mappings}
      />
    </div>
  );
}
