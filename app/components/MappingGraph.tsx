"use client";

import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  ConnectionMode,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ContentModel, UIComponent, PageMapping } from "@/lib/types";
import { Info } from "lucide-react";

interface MappingGraphProps {
  models: ContentModel[];
  components: UIComponent[];
  mappings: PageMapping[];
}

// Helper to calculate component-centric column layout with field-level detail
function calculateContentUIMappingLayout(
  models: ContentModel[],
  components: UIComponent[],
  mappings: PageMapping[]
) {
  const nodeWidth = 300;
  const columnSpacing = 480; // Horizontal spacing between component columns
  const verticalSpacing = 200; // Vertical spacing between nodes in a column
  const fieldSpacing = 28; // Vertical spacing between fields within a model
  const slotSpacing = 28; // Vertical spacing between slots within a component
  const startX = 150;
  const componentY = 600; // Y position where component nodes are placed (middle of column)
  
  // Build detailed mapping: which fields map to which slots
  const componentToFieldMappings = new Map<string, Map<string, Array<{ fieldPath: string; slotName: string }>>>();
  
  mappings.forEach((mapping) => {
    mapping.componentMappings.forEach((cm) => {
      const componentName = cm.componentName;
      const slotMappings = cm.slotMappings || {};
      
      if (!componentToFieldMappings.has(componentName)) {
        componentToFieldMappings.set(componentName, new Map());
      }
      
      const fieldMap = componentToFieldMappings.get(componentName)!;
      
      Object.entries(slotMappings).forEach(([slotName, modelPath]) => {
        let modelName: string | null = null;
        let fieldPath: string = "";
        
        if (typeof modelPath === "string") {
          modelName = modelPath.split(".")[0];
          fieldPath = modelPath;
        } else if (modelPath && typeof modelPath === "object") {
          const obj = modelPath as Record<string, unknown>;
          if ("label" in obj && typeof obj.label === "string") {
            modelName = obj.label.split(".")[0];
            fieldPath = obj.label;
          } else if ("path" in obj && typeof obj.path === "string") {
            modelName = obj.path.split(".")[0];
            fieldPath = obj.path;
          }
        }
        
        if (modelName) {
          if (!fieldMap.has(modelName)) {
            fieldMap.set(modelName, []);
          }
          fieldMap.get(modelName)!.push({ fieldPath, slotName });
        }
      });
    });
  });
  
  // Create layout for each component column
  const columns: Array<{
    componentId: string;
    componentX: number;
    componentY: number;
    modelNodes: Array<{ 
      id: string; 
      x: number; 
      y: number;
      fieldNodes: Array<{ fieldName: string; y: number }>;
    }>;
    slotNodes: Array<{ slotName: string; y: number }>;
  }> = [];
  
  components.forEach((component, componentIdx) => {
    const componentId = `component-${component.name}`;
    const componentX = startX + componentIdx * columnSpacing;
    
    // Get field mappings for this component
    const fieldMappings = componentToFieldMappings.get(component.name) || new Map();
    const modelNodes: Array<{ 
      id: string; 
      x: number; 
      y: number;
      fieldNodes: Array<{ fieldName: string; y: number }>;
    }> = [];
    
    // Position models above the component
    const modelArray = Array.from(fieldMappings.keys());
    let currentY = componentY - 100; // Start above component
    
    modelArray.forEach((modelName) => {
      const modelId = `model-${modelName}`;
      const model = models.find(m => m.name === modelName);
      const mappingsForModel = fieldMappings.get(modelName) || [];
      
      // Calculate height needed for this model (fields + spacing)
      const fieldCount = model?.fields.length || 0;
      const modelHeight = Math.max(80, fieldCount * fieldSpacing + 60);
      
      const modelY = currentY - modelHeight / 2;
      
      // Create field nodes within the model
      const fieldNodes: Array<{ fieldName: string; y: number }> = [];
      if (model) {
        model.fields.forEach((field, fieldIdx) => {
          const fieldY = modelY + 40 + fieldIdx * fieldSpacing;
          fieldNodes.push({ fieldName: field.name, y: fieldY });
        });
      }
      
      modelNodes.push({
        id: modelId,
        x: componentX,
        y: modelY,
        fieldNodes,
      });
      
      currentY -= modelHeight + 40; // Move up for next model
    });
    
    // Create slot nodes within the component
    const slotNodes: Array<{ slotName: string; y: number }> = [];
    component.slots.forEach((slot, slotIdx) => {
      const slotY = componentY + 40 + slotIdx * slotSpacing;
      slotNodes.push({ slotName: slot.name, y: slotY });
    });
    
    columns.push({
      componentId,
      componentX,
      componentY,
      modelNodes,
      slotNodes,
    });
  });
  
  return { columns, componentToFieldMappings };
}

// Component to handle wheel event prevention
function FlowWrapper({ children }: { children: React.ReactNode }) {
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only allow zoom with Cmd/Ctrl key, otherwise let page scroll
      if (!e.metaKey && !e.ctrlKey) {
        e.stopPropagation();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    // Fit view after a short delay to ensure nodes are rendered
    setTimeout(() => fitView({ padding: 0.3 }), 100);
  }, [fitView]);

  return (
    <div ref={containerRef} className="w-full h-full">
      {children}
    </div>
  );
}

export function MappingGraph({
  models,
  components,
  mappings,
}: MappingGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textColor = '#000000'; // Always black text for readability on light backgrounds

  // Calculate initial node and edge layout
  const initialLayout = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();
    const modelNodeMap = new Map<string, ContentModel>();
    const componentNodeMap = new Map<string, UIComponent>();

    // Create maps for quick lookup
    models.forEach((model) => {
      modelNodeMap.set(`model-${model.name}`, model);
    });
    
    components.forEach((component) => {
      componentNodeMap.set(`component-${component.name}`, component);
    });

    // Calculate layout with field-level detail
    const { columns, componentToFieldMappings } = calculateContentUIMappingLayout(
      models,
      components,
      mappings
    );

    // Create nodes for each column
    columns.forEach((column) => {
      const component = componentNodeMap.get(column.componentId);
      if (!component) return;
      
      // Build slot-to-source mapping for this component
      const slotToSource = new Map<string, string>();
      const fieldMappingsForComponent = componentToFieldMappings.get(component.name);
      if (fieldMappingsForComponent) {
        fieldMappingsForComponent.forEach((mappings, modelName) => {
          mappings.forEach(({ fieldPath, slotName }) => {
            slotToSource.set(slotName, fieldPath);
          });
        });
      }
      
      // Create component node (UI Atom)
      nodePositions.set(column.componentId, { 
        x: column.componentX, 
        y: column.componentY 
      });

      nodes.push({
        id: column.componentId,
        type: "default",
        position: { x: column.componentX, y: column.componentY },
        draggable: true,
        data: {
          label: (
            <div className="p-5" style={{ color: textColor }}>
              <div className="font-bold text-lg mb-3 border-b-2 border-purple-400 dark:border-purple-600 pb-2.5" style={{ color: textColor }}>
                {component.name}
              </div>
              <div className="text-sm font-medium mb-3" style={{ color: textColor }}>
                UI Component
              </div>
              <div className="space-y-2 mt-4">
                {component.slots.map((slot, idx) => {
                  const sourceField = slotToSource.get(slot.name);
                  return (
                    <div 
                      key={slot.name}
                      className="text-sm px-3 py-2 bg-purple-100 dark:bg-purple-950/50 rounded-md border-2 border-purple-300 dark:border-purple-700"
                      style={{ marginTop: idx > 0 ? '6px' : '0' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          <span className="font-semibold" style={{ color: textColor }}>{slot.name}</span>
                          <span className="ml-1.5 opacity-60" style={{ color: textColor }}>({slot.type})</span>
                        </span>
                        {sourceField && (
                          <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded border border-blue-300 dark:border-blue-600 whitespace-nowrap">
                            ← {sourceField}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ),
        },
        style: {
          background: "#f3e8ff",
          border: "3px solid #8b5cf6",
          borderRadius: "10px",
          width: 340,
          minHeight: 140,
        },
      });

      // Create model nodes (Content Bricks) with field details
      column.modelNodes.forEach((modelPos) => {
        const model = modelNodeMap.get(modelPos.id);
        if (!model) return;
        
        nodePositions.set(modelPos.id, { 
          x: modelPos.x, 
          y: modelPos.y 
        });

        const fieldMappings = componentToFieldMappings.get(component.name)?.get(model.name) || [];
        const mappedFieldNames = new Set(fieldMappings.map(m => m.fieldPath.split('.')[1] || m.fieldPath));

      nodes.push({
          id: modelPos.id,
        type: "default",
          position: { x: modelPos.x, y: modelPos.y },
          draggable: true,
        data: {
          label: (
            <div className="p-5" style={{ color: textColor }}>
              <div className="font-bold text-lg mb-3 border-b-2 border-blue-400 dark:border-blue-600 pb-2.5" style={{ color: textColor }}>
                {model.name}
              </div>
              <div className="text-sm font-medium mb-3" style={{ color: textColor }}>
                Content Model
              </div>
              <div className="space-y-2 mt-4">
                {model.fields.map((field) => {
                  const isMapped = mappedFieldNames.has(field.name);
                  return (
                    <div 
                      key={field.name}
                      className={`text-sm px-3 py-2 rounded-md border-2 ${
                        isMapped 
                          ? 'bg-blue-100 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600' 
                          : 'bg-zinc-100 dark:bg-zinc-800/70 border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      <span className="font-semibold" style={{ color: textColor }}>
                        {field.name}
                      </span>
                      <span className="ml-2.5 opacity-70" style={{ color: textColor }}>
                        ({field.type})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ),
        },
        style: {
            background: "#dbeafe",
            border: "3px solid #3b82f6",
            borderRadius: "10px",
            width: 300,
            minHeight: 140,
        },
        });
      });
    });

    // Create edges - field-level mappings (Content Bricks → UI Atoms)
    mappings.forEach((mapping) => {
      mapping.componentMappings.forEach((cm) => {
        const componentId = `component-${cm.componentName}`;
        const slotMappings = cm.slotMappings || {};
        
        Object.entries(slotMappings).forEach(([slotName, modelPath]) => {
          let modelName: string | null = null;
          let fieldPath: string = "";
          
          if (typeof modelPath === "string") {
            modelName = modelPath.split(".")[0];
            fieldPath = modelPath;
          } else if (modelPath && typeof modelPath === "object") {
            const obj = modelPath as Record<string, unknown>;
            if ("label" in obj && typeof obj.label === "string") {
              modelName = obj.label.split(".")[0];
              fieldPath = obj.label;
            } else if ("path" in obj && typeof obj.path === "string") {
              modelName = obj.path.split(".")[0];
              fieldPath = obj.path;
            }
          }

          if (modelName) {
            const modelId = `model-${modelName}`;

            // Only create edge if both nodes exist and are in the same column
            if (nodePositions.has(modelId) && nodePositions.has(componentId)) {
              const modelPos = nodePositions.get(modelId)!;
              const componentPos = nodePositions.get(componentId)!;
              
              // Check if they're in the same column (same X position)
              // Only add one edge per model-component pair (avoid duplicates)
              const edgeKey = `${modelId}-${componentId}`;
              const existingEdge = edges.find(e => e.id === edgeKey);
              
              if (Math.abs(modelPos.x - componentPos.x) < 10 && !existingEdge) {
                edges.push({
                  id: edgeKey,
                  source: modelId,
                  target: componentId,
                  type: "straight",
                  animated: true,
                  style: { 
                    stroke: "#8b5cf6", 
                    strokeWidth: 2,
                  },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: "#8b5cf6",
                  },
                });
              }
            }
          }
        });
      });
    });

    return { nodes, edges };
  }, [models, components, mappings]);

  // Initialize state with initial layout, then manage drag state
  const [nodes, setNodes] = useState<Node[]>(() => initialLayout.nodes);
  const [edges, setEdges] = useState<Edge[]>(() => initialLayout.edges);

  // Update nodes/edges when props change (but preserve drag positions)
  useEffect(() => {
    // Only update if the structure changed (new models/components), not on every render
    setNodes(prevNodes => {
      const currentIds = new Set(prevNodes.map(n => n.id));
      const newIds = new Set(initialLayout.nodes.map(n => n.id));
      
      // If IDs changed, reset layout; otherwise keep current positions
      const idsChanged = currentIds.size !== newIds.size || 
        Array.from(currentIds).some(id => !newIds.has(id));
      
      if (idsChanged) {
        return initialLayout.nodes;
      } else {
        // Preserve positions but update node data/content
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        return initialLayout.nodes.map(newNode => {
          const existing = nodeMap.get(newNode.id);
          return existing ? { ...newNode, position: existing.position } : newNode;
        });
      }
    });
    setEdges(initialLayout.edges);
  }, [initialLayout]);

  // Handle node changes (including drag)
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  // Handle edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

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
    <div ref={containerRef} className="w-full h-[900px] border-0 rounded-lg overflow-hidden bg-transparent relative">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg p-5 max-w-sm">
        <div className="flex items-start gap-2.5 mb-4">
          <Info className="h-5 w-5 text-zinc-700 dark:text-zinc-300 mt-0.5 flex-shrink-0" />
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Content & UI Mapping
          </div>
        </div>
        <div className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-blue-200 dark:bg-blue-800 border-2 border-blue-500 flex-shrink-0"></div>
            <span><strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Blue boxes</strong> = Content Models (Content Bricks)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-purple-200 dark:bg-purple-800 border-2 border-purple-500 flex-shrink-0"></div>
            <span><strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Purple boxes</strong> = UI Components (UI Atoms)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-4 h-0.5 bg-purple-600 dark:bg-purple-400 flex-shrink-0"></div>
            <span><strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Arrows</strong> = Data flow direction</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-xs font-medium px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded border border-blue-300 dark:border-blue-600 flex-shrink-0">← field</div>
            <span><strong className="text-zinc-900 dark:text-zinc-100 font-semibold">Blue tags</strong> = Source field mapping</span>
          </div>
          <div className="pt-3 border-t-2 border-zinc-300 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400">
            <strong className="font-semibold">Tip:</strong> Drag nodes to rearrange. Edges stay connected. Scroll horizontally to see all components.
          </div>
        </div>
      </div>

      <ReactFlowProvider>
        <FlowWrapper>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={true}
        connectionMode={ConnectionMode.Loose}
        fitView
            fitViewOptions={{ padding: 0.3 }}
            className="w-full"
            minZoom={0.3}
            maxZoom={2}
            preventScrolling={false}
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
        </FlowWrapper>
      </ReactFlowProvider>
    </div>
  );
}
