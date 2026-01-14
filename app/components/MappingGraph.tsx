"use client";

import { useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  ConnectionMode,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ContentModel, UIComponent, PageMapping } from "@/lib/types";

interface MappingGraphProps {
  models: ContentModel[];
  components: UIComponent[];
  mappings: PageMapping[];
}

export function MappingGraph({
  models,
  components,
  mappings,
}: MappingGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();

    // Calculate positions
    const modelX = 100;
    const componentX = 700;
    const verticalSpacing = 180;
    const modelStartY = 50;
    const componentStartY = 50;

    // Create model nodes (left side)
    models.forEach((model, idx) => {
      const nodeId = `model-${model.name}`;
      const y = modelStartY + idx * verticalSpacing;
      nodePositions.set(nodeId, { x: modelX, y });

      nodes.push({
        id: nodeId,
        type: "default",
        position: { x: modelX, y },
        data: {
          label: (
            <div className="p-2">
              <div className="font-semibold text-blue-700 dark:text-blue-300">
                {model.name}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                {model.fields.length} field{model.fields.length !== 1 ? "s" : ""}
              </div>
            </div>
          ),
        },
        style: {
          background: "#dbeafe",
          border: "2px solid #3b82f6",
          borderRadius: "8px",
          width: 180,
          color: "#1e40af",
        },
      });
    });

    // Create component nodes (right side)
    components.forEach((component, idx) => {
      const nodeId = `component-${component.name}`;
      const y = componentStartY + idx * verticalSpacing;
      nodePositions.set(nodeId, { x: componentX, y });

      nodes.push({
        id: nodeId,
        type: "default",
        position: { x: componentX, y },
        data: {
          label: (
            <div className="p-2">
              <div className="font-semibold text-purple-700 dark:text-purple-300">
                {component.name}
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                {component.slots.length} slot{component.slots.length !== 1 ? "s" : ""}
              </div>
            </div>
          ),
        },
        style: {
          background: "#f3e8ff",
          border: "2px solid #8b5cf6",
          borderRadius: "8px",
          width: 180,
          color: "#6b21a8",
        },
      });
    });

    // Create edges based on mappings
    mappings.forEach((mapping) => {
      mapping.componentMappings.forEach((cm) => {
        // Guard against undefined/null slotMappings
        const slotMappings = cm.slotMappings || {};
        Object.entries(slotMappings).forEach(([slot, modelPath]) => {
          // Safely handle modelPath (could be string, object, or null)
          let modelName: string | null = null;
          
          if (typeof modelPath === "string") {
            modelName = modelPath.split(".")[0];
          } else if (modelPath && typeof modelPath === "object") {
            const obj = modelPath as Record<string, unknown>;
            if ("label" in obj && typeof obj.label === "string") {
              modelName = obj.label.split(".")[0];
            } else if ("path" in obj && typeof obj.path === "string") {
              modelName = obj.path.split(".")[0];
            }
          }

          if (modelName) {
            const sourceId = `model-${modelName}`;
            const targetId = `component-${cm.componentName}`;

            // Only create edge if both nodes exist
            if (
              nodePositions.has(sourceId) &&
              nodePositions.has(targetId)
            ) {
              // Check if edge already exists to avoid duplicates
              // Check by source, target, AND label to prevent duplicate labels
              const edgeExists = edges.some(
                (e) => e.source === sourceId && e.target === targetId && e.label === slot
              );

              if (!edgeExists) {
                edges.push({
                  id: `${sourceId}-${targetId}-${slot}-${edges.length}`,
                  source: sourceId,
                  target: targetId,
                  label: slot,
                  type: "smoothstep",
                  animated: true,
                  style: { stroke: "#8b5cf6", strokeWidth: 2 },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: "#8b5cf6",
                  },
                  labelStyle: {
                    fill: "#6b21a8",
                    fontWeight: 600,
                    fontSize: 11,
                  },
                  labelBgStyle: {
                    fill: "#ffffff",
                    fillOpacity: 1,
                    stroke: "#8b5cf6",
                    strokeWidth: 1,
                    rx: 4,
                    ry: 4,
                  },
                  labelBgPadding: [4, 6],
                  labelBgBorderRadius: 4,
                  labelShowBg: true,
                });
              }
            }
          }
        });
      });
    });

    return { nodes, edges };
  }, [models, components, mappings]);

  // Show empty state if no data
  if (nodes.length === 0) {
    return (
      <div className="w-full h-[600px] border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-lg">
            No mappings to visualize
          </p>
          <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-2">
            Content models and components will appear here once analyzed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background 
          color="#e5e7eb" 
          gap={16}
          className="dark:opacity-20"
        />
        <Controls 
          className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg" 
        />
      </ReactFlow>
    </div>
  );
}
