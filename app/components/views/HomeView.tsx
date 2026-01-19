"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContentModel, UIComponent } from "@/lib/mock-data";

interface HomeViewProps {
  contentModels: ContentModel[];
  uiComponents: UIComponent[];
}

export function HomeView({ contentModels, uiComponents }: HomeViewProps) {
  return (
    <div className="p-6 space-y-8">
      {/* Content Models Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">Content Models</h2>
          <Badge variant="secondary">{contentModels.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contentModels.map((model, modelIndex) => (
            <Card key={`model-${model.name}-${modelIndex}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{model.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {model.fields.map((field, fieldIndex) => (
                    <Badge
                      key={`field-${model.name}-${field.name}-${fieldIndex}`}
                      variant="outline"
                      className="text-xs"
                    >
                      {field.name}: {field.type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* UI Components Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">UI Components</h2>
          <Badge variant="secondary">{uiComponents.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uiComponents.map((component, componentIndex) => (
            <Card key={`component-${component.name}-${componentIndex}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{component.name}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {component.selector}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {component.slots.map((slot, slotIndex) => (
                    <Badge
                      key={`slot-${component.name}-${slot.name}-${slotIndex}`}
                      variant="outline"
                      className="text-xs"
                    >
                      {slot.name} ({slot.type})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
