/**
 * In-memory job store for analysis jobs
 * Note: This works for single-instance deployments.
 * For multi-instance, consider using Redis or a database.
 */

export type JobStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface JobState {
  status: JobStatus;
  progress: number;
  stage: string;
  message: string;
  result?: {
    analysis: any;
    webflowExport: any;
  };
  error?: string;
  createdAt: number;
  updatedAt: number;
}

class JobStore {
  private jobs = new Map<string, JobState>();

  createJob(jobId: string): void {
    this.jobs.set(jobId, {
      status: 'pending',
      progress: 0,
      stage: 'initializing',
      message: 'Initializing analysis...',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  getJob(jobId: string): JobState | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(
    jobId: string,
    updates: Partial<Omit<JobState, 'createdAt' | 'updatedAt'>>
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    this.jobs.set(jobId, {
      ...job,
      ...updates,
      updatedAt: Date.now(),
    });
  }

  deleteJob(jobId: string): void {
    this.jobs.delete(jobId);
  }

  // Clean up old jobs (older than 1 hour)
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.updatedAt < oneHourAgo) {
        this.jobs.delete(jobId);
      }
    }
  }
}

// Singleton instance
export const jobStore = new JobStore();

// Cleanup old jobs every 10 minutes (only in Node.js environment)
// In serverless, cleanup happens on each request
if (typeof process !== 'undefined' && process.env && typeof setInterval !== 'undefined') {
  setInterval(() => {
    jobStore.cleanup();
  }, 10 * 60 * 1000);
}

