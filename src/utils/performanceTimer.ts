import { logAnalyticsEvent } from '../services/analyticsService';
import { Timestamp } from 'firebase/firestore';
import { registerPerformanceMetric } from '../components/PerformanceDashboard';

interface TimerMetadata {
  operation: string;
  result?: string;
  details?: Record<string, unknown>;
}

// Extend the existing metadata type from the analytics service
interface PerformanceMetadata {
  timeSpent?: number;
  deviceType?: string;
  location?: string;
  // Additional performance-specific fields
  operation?: string;
  result?: string;
  errorMessage?: string;
  queryDetails?: Record<string, unknown>;
}

/**
 * A simple performance timer utility to track execution times of operations
 * and log them to the console and/or analytics.
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private operation: string = '';
  private userId?: string;
  private isRunning: boolean = false;
  
  /**
   * Initialize a performance timer
   * @param operation Name of the operation being timed
   * @param userId Optional user ID for analytics tracking
   */
  constructor(operation: string, userId?: string) {
    this.operation = operation;
    this.userId = userId;
  }
  
  /**
   * Start the timer
   * @returns The timer instance for chaining
   */
  start(): PerformanceTimer {
    this.startTime = performance.now();
    this.isRunning = true;
    return this;
  }
  
  /**
   * Stop the timer and log the results
   * @param result Optional result status (success, error, etc.)
   * @param details Additional details about the operation
   * @returns The execution time in milliseconds
   */
  stop(result?: string, details?: Record<string, unknown>): number {
    if (!this.isRunning) {
      console.warn('Timer was stopped without being started');
      return 0;
    }
    
    const endTime = performance.now();
    const executionTime = endTime - this.startTime;
    this.isRunning = false;
    
    // Only log errors to console in development mode
    if (import.meta.env.DEV && result === 'error') {
      console.error(
        `[PERFORMANCE ERROR] ${this.operation}: ${executionTime.toFixed(2)}ms`,
        details || ''
      );
    }
    
    // Register with the performance dashboard
    registerPerformanceMetric({
      operation: this.operation,
      executionTime,
      timestamp: Date.now(),
      result: result || 'completed',
      details
    });
    
    // Log to analytics in production
    this.logToAnalytics(executionTime, { operation: this.operation, result, details });
    
    return executionTime;
  }
  
  /**
   * Log timing data to Firebase Analytics
   */
  private logToAnalytics(executionTime: number, metadata: TimerMetadata): void {
    // Only log to analytics if we have a user ID
    if (!this.userId) return;
    
    try {
      // Create a timestamp for the event
      const timestamp = Timestamp.now();
      
      // Create a metadata object without undefined values
      const analyticsMetadata: PerformanceMetadata = {
        timeSpent: executionTime / 1000, // Convert to seconds for consistency with other analytics
        operation: metadata.operation
      };
      
      // Only add defined fields
      if (metadata.result !== undefined) {
        analyticsMetadata.result = metadata.result;
      }
      
      // Only add details if they exist and are not undefined
      if (metadata.details && Object.keys(metadata.details).length > 0) {
        // Filter out any undefined values from details
        const filteredDetails: Record<string, unknown> = {};
        Object.entries(metadata.details).forEach(([key, value]) => {
          if (value !== undefined) {
            filteredDetails[key] = value;
          }
        });
        
        if (Object.keys(filteredDetails).length > 0) {
          analyticsMetadata.queryDetails = filteredDetails;
        }
      }
      
      // Log a custom analytics event
      logAnalyticsEvent({
        type: 'post_view', // Using post_view as a generic event type
        userId: this.userId,
        postId: 'performance_metric', // Using a placeholder ID for system operations
        timestamp,
        metadata: analyticsMetadata
      }).catch(() => {
        // Silently ignore errors
      });
    } catch {
      // Silently fail in case of analytics errors
    }
  }

  /**
   * Utility method to wrap an async function call with timing
   * @param asyncFn The async function to time
   * @returns The result of the async function
   */
  static async timeAsync<T>(
    operation: string, 
    asyncFn: () => Promise<T>, 
    userId?: string
  ): Promise<T> {
    const timer = new PerformanceTimer(operation, userId).start();
    try {
      const result = await asyncFn();
      timer.stop('success');
      return result;
    } catch (error) {
      timer.stop('error', { error: (error instanceof Error) ? error.message : String(error) });
      throw error;
    }
  }
}

/**
 * Create and start a performance timer for the specified operation
 * @param operation Name of the operation being timed
 * @param userId Optional user ID for analytics tracking
 * @returns A started PerformanceTimer instance
 */
export function startTimer(operation: string, userId?: string): PerformanceTimer {
  return new PerformanceTimer(operation, userId).start();
}

/**
 * Time an async function execution 
 * @param operation Name of the operation being timed
 * @param asyncFn The async function to execute and time
 * @param userId Optional user ID for analytics tracking
 * @returns The result of the async function
 */
export function timeAsync<T>(
  operation: string, 
  asyncFn: () => Promise<T>, 
  userId?: string
): Promise<T> {
  return PerformanceTimer.timeAsync(operation, asyncFn, userId);
} 