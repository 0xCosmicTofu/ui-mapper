"use client";

interface ScreenshotViewProps {
  screenshotPath: string;
}

export function ScreenshotView({ screenshotPath }: ScreenshotViewProps) {
  return (
    <div className="h-full w-full p-6 overflow-auto">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Website Screenshot</h2>
        <p className="text-sm text-muted-foreground">
          Full-page screenshot of the analyzed website
        </p>
        <div className="rounded-lg border overflow-hidden">
          <img
            src={screenshotPath}
            alt="Website screenshot"
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
