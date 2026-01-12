import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { WebflowExport } from "@/lib/types";

const ExportRequestSchema = z.object({
  webflowExport: z.any(), // WebflowExport type
  format: z.enum(["json", "csv"]).default("json"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webflowExport, format } = ExportRequestSchema.parse(body);

    if (format === "json") {
      return NextResponse.json(webflowExport, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="webflow-export.json"',
        },
      });
    }

    // CSV export for collections
    if (format === "csv" && webflowExport.csvData) {
      const csvContent = Object.entries(webflowExport.csvData)
        .map(([collectionSlug, items]) => {
          const rows = items as Array<Record<string, unknown>>;
          if (rows.length === 0) return "";

          const headers = Object.keys(rows[0]).join(",");
          const dataRows = rows
            .map((row) =>
              Object.values(row)
                .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                .join(",")
            )
            .join("\n");

          return `Collection: ${collectionSlug}\n${headers}\n${dataRows}\n\n`;
        })
        .join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="webflow-export.csv"',
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format or missing CSV data" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
