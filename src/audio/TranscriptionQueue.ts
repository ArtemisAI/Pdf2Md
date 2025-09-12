/**
 * Transcription Queue System
 * Manages asynchronous audio transcription tasks for RTX 3060 optimized processing
 */

import { TranscriptionTask, TranscriptionConfig, AudioTranscriptionOptions, TranscriptionResult } from '../types/audio.js';
import { ProgressReporter, TranscriptionProgressTracker } from './ProgressReporter.js';
import { GPUAwareErrorHandler } from './ErrorHandler.js';
import { ConfigManager } from './ConfigManager.js';

export class TranscriptionQueue {
  private tasks = new Map<string, TranscriptionTask>();
  private processingTasks = new Set<string>();
  private static instance: TranscriptionQueue;
  private progressReporter: ProgressReporter;
  
  private constructor() {
    this.progressReporter = ProgressReporter.getInstance();
  }
  
  static getInstance(): TranscriptionQueue {
    if (!TranscriptionQueue.instance) {
      TranscriptionQueue.instance = new TranscriptionQueue();
    }
    return TranscriptionQueue.instance;
  }
  
  /**
   * Enqueue a new transcription task
   */
  async enqueue(options: AudioTranscriptionOptions): Promise<string> {
    const taskId = this.generateTaskId();
    
    const task: TranscriptionTask = {
      id: taskId,
      filePath: options.filepath,
      language: options.language || 'en',
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      config: options.config ? { ...ConfigManager.getOptimalConfig(), ...options.config } : ConfigManager.getOptimalConfig()
    };
    
    this.tasks.set(taskId, task);
    
    // Subscribe to progress updates if callback provided
    if (options.progressCallback) {
      this.progressReporter.subscribe(taskId, options.progressCallback);
    }
    
    // Start processing asynchronously
    this.processNext();
    
    return taskId;
  }
  
  /**
   * Get task status
   */
  getTask(taskId: string): TranscriptionTask | undefined {
    return this.tasks.get(taskId);
  }
  
  /**
   * Get task result if completed
   */
  getResult(taskId: string): TranscriptionResult | undefined {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'completed' && task.result) {
      return {
        taskId: task.id,
        text: task.result,
        path: task.filePath,
        language: task.language
      };
    }
    return undefined;
  }
  
  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'queued') {
      task.status = 'failed';
      task.error = 'Task cancelled by user';
      task.completedAt = new Date();
      return true;
    }
    return false;
  }
  
  /**
   * Get all tasks
   */
  getAllTasks(): TranscriptionTask[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TranscriptionTask['status']): TranscriptionTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }
  
  /**
   * Clean up completed tasks older than specified time
   */
  cleanupOldTasks(maxAgeMs: number = 24 * 60 * 60 * 1000): void { // Default 24 hours
    const now = new Date();
    const tasksToRemove: string[] = [];
    
    for (const [taskId, task] of this.tasks) {
      if (task.completedAt && (now.getTime() - task.completedAt.getTime()) > maxAgeMs) {
        tasksToRemove.push(taskId);
      }
    }
    
    tasksToRemove.forEach(taskId => {
      this.tasks.delete(taskId);
      this.progressReporter.unsubscribe(taskId);
    });
  }
  
  /**
   * Process next task in queue
   */
  private async processNext(): Promise<void> {
    const task = this.getNextQueuedTask();
    if (!task || this.processingTasks.has(task.id)) {
      return;
    }
    
    this.processingTasks.add(task.id);
    
    try {
      await this.processTask(task);
    } catch (error) {
      console.error(`Error processing task ${task.id}:`, error);
    } finally {
      this.processingTasks.delete(task.id);
    }
    
    // Continue processing remaining tasks
    setImmediate(() => this.processNext());
  }
  
  /**
   * Get next queued task
   */
  private getNextQueuedTask(): TranscriptionTask | undefined {
    for (const task of this.tasks.values()) {
      if (task.status === 'queued' && !this.processingTasks.has(task.id)) {
        return task;
      }
    }
    return undefined;
  }
  
  /**
   * Process a single task
   */
  private async processTask(task: TranscriptionTask): Promise<void> {
    const tracker = new TranscriptionProgressTracker(task.id);
    
    try {
      // Update task status
      task.status = 'processing';
      task.progress = 0;
      
      tracker.stage('initializing', 'Starting RTX 3060 optimized transcription...');
      
      // Validate audio file exists
      if (!await this.fileExists(task.filePath)) {
        throw new Error(`Audio file not found: ${task.filePath}`);
      }
      
      tracker.stage('processing_audio', 'Validating audio format...');
      
      // Process the transcription
      const result = await this.executeTranscription(task, tracker);
      
      // Update task with result
      task.status = 'completed';
      task.result = result.text;
      task.progress = 100;
      task.completedAt = new Date();
      
      tracker.complete('RTX 3060 optimized transcription completed successfully');
      
    } catch (error) {
      // Handle error with GPU-aware fallback
      const transcriptionError = GPUAwareErrorHandler.handle(error, `Task ${task.id}`);
      
      task.status = 'failed';
      task.error = transcriptionError.message;
      task.completedAt = new Date();
      
      tracker.error(transcriptionError);
      
      // If retryable, could implement retry logic here
      if (transcriptionError.retryable) {
        console.log(`Task ${task.id} failed but is retryable: ${transcriptionError.message}`);
        // Could re-queue with different settings
      }
    }
  }
  
  /**
   * Execute the actual transcription
   */
  private async executeTranscription(task: TranscriptionTask, tracker: TranscriptionProgressTracker): Promise<TranscriptionResult> {
    // Import the enhanced audio transcription module
    const { EnhancedAudioTranscription } = await import('./EnhancedAudioTranscription.js');
    
    tracker.stage('loading_model', 'Loading RTX 3060 optimized model...');
    
    // Create transcription instance with task configuration
    const transcription = new EnhancedAudioTranscription(task.config);
    
    // Set up progress tracking
    const progressCallback = (taskId: string, progress: number, message: string) => {
      task.progress = progress;
      tracker.update(progress, message);
    };
    
    tracker.stage('starting_transcription', 'Starting GPU-accelerated transcription...');
    
    // Execute transcription
    const result = await transcription.transcribe({
      filepath: task.filePath,
      language: task.language
    });
    
    return result;
  }
  
  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs');
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `rtx3060_task_${timestamp}_${random}`;
  }
  
  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const tasks = Array.from(this.tasks.values());
    
    return {
      total: tasks.length,
      queued: tasks.filter(t => t.status === 'queued').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      activeProcessing: this.processingTasks.size
    };
  }
  
  /**
   * Get processing status summary
   */
  getProcessingStatus(): ProcessingStatus {
    const stats = this.getQueueStats();
    const activeTasks = this.getTasksByStatus('processing');
    
    return {
      isProcessing: stats.processing > 0,
      queueLength: stats.queued,
      activeTasks: activeTasks.map(task => ({
        id: task.id,
        filePath: task.filePath,
        progress: task.progress,
        startedAt: task.createdAt
      }))
    };
  }
}

/**
 * Queue statistics interface
 */
export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  activeProcessing: number;
}

/**
 * Processing status interface
 */
export interface ProcessingStatus {
  isProcessing: boolean;
  queueLength: number;
  activeTasks: {
    id: string;
    filePath: string;
    progress: number;
    startedAt: Date;
  }[];
}

/**
 * Helper function to create and manage transcription queue
 */
export async function transcribeAudio(options: AudioTranscriptionOptions): Promise<string> {
  const queue = TranscriptionQueue.getInstance();
  return await queue.enqueue(options);
}

/**
 * Helper function to get transcription result
 */
export function getTranscriptionResult(taskId: string): TranscriptionResult | undefined {
  const queue = TranscriptionQueue.getInstance();
  return queue.getResult(taskId);
}

/**
 * Helper function to check task status
 */
export function getTaskStatus(taskId: string): TranscriptionTask | undefined {
  const queue = TranscriptionQueue.getInstance();
  return queue.getTask(taskId);
}
