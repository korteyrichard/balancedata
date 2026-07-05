/**
 * Print Request Manager
 * Handles print requests with validation to prevent stale/out-of-order prints
 */

interface PrintJob {
  id: string;
  timestamp: number;
  pageState: string;
  callback?: () => void;
}

class PrintRequestManager {
  private currentJobId: string | null = null;
  private jobHistory: Map<string, PrintJob> = new Map();
  private maxJobAge = 5 * 60 * 1000; // 5 minutes
  private isPageVisible = true;

  constructor() {
    this.setupVisibilityListener();
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      
      if (this.isPageVisible) {
        // Validate current job when page becomes visible
        this.validateCurrentJob();
      }
    });
  }

  /**
   * Create a new print job
   */
  createJob(pageState: string, callback?: () => void): string {
    const jobId = this.generateJobId(pageState);
    
    // Cancel previous job
    if (this.currentJobId) {
      this.cancelJob(this.currentJobId);
    }

    const job: PrintJob = {
      id: jobId,
      timestamp: Date.now(),
      pageState,
      callback,
    };

    this.jobHistory.set(jobId, job);
    this.currentJobId = jobId;

    return jobId;
  }

  /**
   * Execute a print job if it's valid
   */
  executeJob(jobId: string): boolean {
    // Check if job exists
    const job = this.jobHistory.get(jobId);
    if (!job) {
      console.warn(`[PrintManager] Job ${jobId} not found`);
      return false;
    }

    // Check if it's the current job
    if (jobId !== this.currentJobId) {
      console.warn(`[PrintManager] Job ${jobId} is stale (current: ${this.currentJobId})`);
      this.cancelJob(jobId);
      return false;
    }

    // Check if job is too old
    const age = Date.now() - job.timestamp;
    if (age > this.maxJobAge) {
      console.warn(`[PrintManager] Job ${jobId} is too old (${age}ms)`);
      this.cancelJob(jobId);
      return false;
    }

    // Check if page is visible
    if (document.hidden) {
      console.warn(`[PrintManager] Page is hidden, deferring print`);
      return false;
    }

    // Execute callback if provided
    if (job.callback) {
      try {
        job.callback();
      } catch (error) {
        console.error('[PrintManager] Callback error:', error);
        return false;
      }
    }

    // Execute print
    try {
      window.print();
      this.jobHistory.delete(jobId);
      this.currentJobId = null;
      return true;
    } catch (error) {
      console.error('[PrintManager] Print error:', error);
      return false;
    }
  }

  /**
   * Cancel a specific job
   */
  cancelJob(jobId: string): void {
    this.jobHistory.delete(jobId);
    if (this.currentJobId === jobId) {
      this.currentJobId = null;
    }
  }

  /**
   * Cancel all jobs
   */
  cancelAllJobs(): void {
    this.jobHistory.clear();
    this.currentJobId = null;
  }

  /**
   * Validate current job when page becomes visible
   */
  private validateCurrentJob(): void {
    if (!this.currentJobId) return;

    const job = this.jobHistory.get(this.currentJobId);
    if (!job) {
      this.currentJobId = null;
      return;
    }

    // Check age
    const age = Date.now() - job.timestamp;
    if (age > this.maxJobAge) {
      console.warn(`[PrintManager] Current job expired (${age}ms)`);
      this.cancelJob(this.currentJobId);
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(pageState: string): string {
    const timestamp = Date.now();
    const hash = this.simpleHash(pageState);
    return `job_${timestamp}_${hash}`;
  }

  /**
   * Simple hash function for page state
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get current job info (for debugging)
   */
  getCurrentJobInfo() {
    if (!this.currentJobId) return null;
    return this.jobHistory.get(this.currentJobId);
  }

  /**
   * Get all pending jobs (for debugging)
   */
  getPendingJobs() {
    return Array.from(this.jobHistory.values());
  }
}

// Export singleton instance
export const printManager = new PrintRequestManager();

/**
 * Helper function for safe printing
 */
export const safePrint = (pageState: string, callback?: () => void): string => {
  const jobId = printManager.createJob(pageState, callback);
  
  // Execute immediately if page is visible
  if (!document.hidden) {
    printManager.executeJob(jobId);
  } else {
    // Wait for page to become visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        printManager.executeJob(jobId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return jobId;
};

/**
 * Helper to cancel a print job
 */
export const cancelPrint = (jobId: string): void => {
  printManager.cancelJob(jobId);
};

/**
 * Helper to cancel all print jobs
 */
export const cancelAllPrints = (): void => {
  printManager.cancelAllJobs();
};
