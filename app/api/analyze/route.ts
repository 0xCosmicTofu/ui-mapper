import { NextRequest, NextResponse } from "next/server";
import { SiteAnalyzer } from "@/lib/services/analyzer";
import { z } from "zod";

const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = AnalyzeRequestSchema.parse(body);

    const analyzer = new SiteAnalyzer();
    const result = await analyzer.analyze(url);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
