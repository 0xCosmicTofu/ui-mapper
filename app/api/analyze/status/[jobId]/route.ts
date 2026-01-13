import { NextRequest, NextResponse } from "next/server";
import { jobStore } from "@/lib/services/job-store";

/**
 * Get the status of an analysis job
 * Client polls this endpoint to get progress updates
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> | { jobId: string } }
) {
  // Handle both sync and async params (Next.js 15+ uses async params)
  const resolvedParams = params instanceof Promise ? await params : params;
  const { jobId } = resolvedParams;

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

