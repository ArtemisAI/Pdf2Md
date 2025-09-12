/**
 * Progress Reporter for Audio Transcription
 * Provides real-time progress updates during transcription
 */

import { ProgressCallback } from '../types/audio.js';

export class ProgressReporter {
  private callbacks = new Map<string, ProgressCallback[]>();
  private static instance: ProgressReporter;
  
  static getInstance(): ProgressReporter {
    if (!ProgressReporter.instance) {
      ProgressReporter.instance = new ProgressReporter();
    }
    return ProgressReporter.instance;
  }
  
  /**
   * Subscribe to progress updates for a specific task
   */
  subscribe(taskId: string, callback: ProgressCallback): void {
    if (!this.callbacks.has(taskId)) {
      this.callbacks.set(taskId, []);
    }
    this.callbacks.get(taskId)!.push(callback);
  }
  
  /**
   * Unsubscribe from progress updates
   */
  unsubscribe(taskId: string, callback?: ProgressCallback): void {
    if (!this.callbacks.has(taskId)) {
      return;
    }
    
    if (callback) {
      const callbacks = this.callbacks.get(taskId)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      // Remove all callbacks for this task
      this.callbacks.delete(taskId);
    }
  }
  
  /**
   * Report progress update
   */
  report(taskId: string, progress: number, message: string, isError = false): void {
    const callbacks = this.callbacks.get(taskId) || [];
    
    // Ensure progress is between 0 and 100
    const normalizedProgress = Math.max(0, Math.min(100, progress));
    
    callbacks.forEach(callback => {
      try {
        callback(taskId, normalizedProgress, message, isError);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
    
    // Log progress for debugging
    if (isError) {
      console.error(`[${taskId}] Error: ${message}`);
    } else {
      console.log(`[${taskId}] ${normalizedProgress}%: ${message}`);
    }
  }
  
  /**
   * Report specific progress stages
   */
  reportStage(taskId: string, stage: ProgressStage, details?: string): void {
    const { progress, message } = this.getStageInfo(stage, details);
    this.report(taskId, progress, message);
  }
  
  /**
   * Report error with specific error information
   */
  reportError(taskId: string, error: Error, progress = 0): void {
    this.report(taskId, progress, `Error: ${error.message}`, true);
  }
  
  /**
   * Report completion
   */
  reportComplete(taskId: string, message = 'Transcription completed successfully'): void {
    this.report(taskId, 100, message);
    
    // Clean up callbacks after completion
    setTimeout(() => {
      this.callbacks.delete(taskId);
    }, 5000); // Keep callbacks for 5 seconds after completion
  }
  
  /**
   * Get progress information for different stages
   */
  private getStageInfo(stage: ProgressStage, details?: string): { progress: number; message: string } {
    switch (stage) {
      case 'initializing':
        return { progress: 5, message: details || 'Initializing transcription...' };
      
      case 'loading_model':
        return { progress: 15, message: details || 'Loading transcription model...' };
      
      case 'processing_audio':
        return { progress: 25, message: details || 'Processing audio file...' };
      
      case 'validating_format':
        return { progress: 35, message: details || 'Validating audio format...' };
      
      case 'starting_transcription':
        return { progress: 45, message: details || 'Starting transcription...' };
      
      case 'transcribing':
        return { progress: 70, message: details || 'Transcribing audio...' };
      
      case 'post_processing':
        return { progress: 85, message: details || 'Post-processing results...' };
      
      case 'finalizing':
        return { progress: 95, message: details || 'Finalizing transcription...' };
      
      case 'switching_to_cpu':
        return { progress: 20, message: details || 'GPU error detected, switching to CPU...' };
      
      case 'optimizing_memory':
        return { progress: 30, message: details || 'Optimizing memory usage...' };
      
      case 'retrying':
        return { progress: 40, message: details || 'Retrying with different settings...' };
      
      default:
        return { progress: 0, message: details || 'Processing...' };
    }
  }
  
  /**
   * Create a progress callback that logs to console
   */
  static createConsoleCallback(): ProgressCallback {
    return (taskId: string, progress: number, message: string, isError?: boolean) => {
      const timestamp = new Date().toISOString();
      const prefix = isError ? '[ERROR]' : '[INFO]';
      console.log(`${timestamp} ${prefix} [${taskId}] ${progress}%: ${message}`);
    };
  }
  
  /**
   * Create a progress callback that stores updates in memory
   */
  static createMemoryCallback(): { callback: ProgressCallback; getUpdates: () => ProgressUpdate[] } {
    const updates: ProgressUpdate[] = [];
    
    const callback: ProgressCallback = (taskId: string, progress: number, message: string, isError?: boolean) => {
      updates.push({
        taskId,
        progress,
        message,
        isError: !!isError,
        timestamp: new Date()
      });
    };
    
    return {
      callback,
      getUpdates: () => [...updates] // Return copy
    };
  }
  
  /**
   * Get current progress for a task (approximate)
   */
  getCurrentProgress(taskId: string): number {
    // This is a simple implementation - in a real scenario you might want to track this more precisely
    const callbacks = this.callbacks.get(taskId);
    return callbacks && callbacks.length > 0 ? 0 : -1; // -1 means no active task
  }
  
  /**
   * Check if task has active progress tracking
   */
  hasActiveTask(taskId: string): boolean {
    return this.callbacks.has(taskId) && this.callbacks.get(taskId)!.length > 0;
  }
  
  /**
   * Get all active task IDs
   */
  getActiveTaskIds(): string[] {
    return Array.from(this.callbacks.keys()).filter(taskId => 
      this.callbacks.get(taskId)!.length > 0
    );
  }
}

/**
 * Progress stages for audio transcription
 */
export type ProgressStage = 
  | 'initializing'
  | 'loading_model'
  | 'processing_audio'
  | 'validating_format'
  | 'starting_transcription'
  | 'transcribing'
  | 'post_processing'
  | 'finalizing'
  | 'switching_to_cpu'
  | 'optimizing_memory'
  | 'retrying';

/**
 * Progress update data structure
 */
export interface ProgressUpdate {
  taskId: string;
  progress: number;
  message: string;
  isError: boolean;
  timestamp: Date;
}

/**
 * Helper class for tracking transcription progress
 */
export class TranscriptionProgressTracker {
  private reporter: ProgressReporter;
  private taskId: string;
  
  constructor(taskId: string) {
    this.taskId = taskId;
    this.reporter = ProgressReporter.getInstance();
  }
  
  /**
   * Update progress with percentage and message
   */
  update(progress: number, message: string): void {
    this.reporter.report(this.taskId, progress, message);
  }
  
  /**
   * Update to a specific stage
   */
  stage(stage: ProgressStage, details?: string): void {
    this.reporter.reportStage(this.taskId, stage, details);
  }
  
  /**
   * Report error
   */
  error(error: Error, progress = 0): void {
    this.reporter.reportError(this.taskId, error, progress);
  }
  
  /**
   * Report completion
   */
  complete(message?: string): void {
    this.reporter.reportComplete(this.taskId, message);
  }
  
  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressCallback): void {
    this.reporter.subscribe(this.taskId, callback);
  }
  
  /**
   * Unsubscribe from progress updates
   */
  unsubscribe(callback?: ProgressCallback): void {
    this.reporter.unsubscribe(this.taskId, callback);
  }
}