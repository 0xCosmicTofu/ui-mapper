import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/services/job-store";

/**
 * Get the status of an analysis job
 * Client polls this endpoint to get progress updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  const job = jobStore.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      {
        success: false,
        error: "Job not found",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    jobId,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    message: job.message,
    result: job.result,
    error: job.error,
  });
}

