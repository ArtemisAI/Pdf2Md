import { randomUUID } from 'node:crypto';
import { ProgressReporter } from './audio/ProgressReporter.js';
import { RedisEventStore, StoredEvent } from './redis-store.js';

export interface ProgressStream {
  sessionId: string;
  taskId: string;
  send(type: string, data: any): Promise<void>;
  close(): Promise<void>;
}

export interface StreamingProgress {
  stage: string;
  percent: number;
  message: string;
  timestamp: number;
}

export class ProgressStreamManager {
  private static instance: ProgressStreamManager;
  private streams: Map<string, ProgressStream> = new Map();
  private eventStore: RedisEventStore;
  private progressReporter: ProgressReporter;

  constructor() {
    this.eventStore = new RedisEventStore();
    this.progressReporter = ProgressReporter.getInstance();
  }

  static getInstance(): ProgressStreamManager {
    if (!ProgressStreamManager.instance) {
      ProgressStreamManager.instance = new ProgressStreamManager();
    }
    return ProgressStreamManager.instance;
  }

  createProgressStream(sessionId: string, taskId: string): ProgressStream {
    const streamId = `${sessionId}:${taskId}`;
    
    const stream: ProgressStream = {
      sessionId,
      taskId,
      send: async (type: string, data: any) => {
        const event: StoredEvent = {
          id: randomUUID(),
          type,
          data,
          timestamp: Date.now()
        };

        // Store event for resumability
        await this.eventStore.store(sessionId, event);

        // Emit to any listening SSE connections
        await this.emitToSession(sessionId, event);
      },
      close: async () => {
        this.streams.delete(streamId);
      }
    };

    this.streams.set(streamId, stream);
    return stream;
  }

  async streamAudioTranscription(sessionId: string, taskId: string, filePath: string, options: any = {}) {
    const progressStream = this.createProgressStream(sessionId, taskId);

    // Subscribe to progress updates from the audio system
    this.progressReporter.subscribe(taskId, async (taskId: string, progress: number, message: string, isError?: boolean) => {
      const progressData: StreamingProgress = {
        stage: this.determineStage(progress, message),
        percent: progress,
        message,
        timestamp: Date.now()
      };

      if (isError) {
        await progressStream.send('error', {
          taskId,
          error: message,
          progress: progressData
        });
      } else {
        await progressStream.send('progress', {
          taskId,
          progress: progressData
        });
      }

      // Send completion event
      if (progress >= 100 && !isError) {
        await progressStream.send('complete', {
          taskId,
          progress: progressData,
          timestamp: Date.now()
        });
      }
    });

    // Send initial progress
    await progressStream.send('started', {
      taskId,
      filePath,
      options,
      progress: {
        stage: 'initializing',
        percent: 0,
        message: 'Starting audio transcription...',
        timestamp: Date.now()
      }
    });

    return progressStream;
  }

  private determineStage(progress: number, message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('loading') || lowerMessage.includes('initializing')) {
      return 'loading';
    } else if (lowerMessage.includes('processing') || lowerMessage.includes('transcribing')) {
      return 'processing';
    } else if (lowerMessage.includes('finalizing') || lowerMessage.includes('completing')) {
      return 'finalizing';
    } else if (progress >= 100) {
      return 'completed';
    } else if (progress > 0) {
      return 'processing';
    } else {
      return 'initializing';
    }
  }

  private async emitToSession(sessionId: string, event: StoredEvent): Promise<void> {
    // This will be implemented to emit to SSE connections
    // For now, we'll just log it
    console.log(`📡 Streaming to session ${sessionId}:`, {
      type: event.type,
      timestamp: new Date(event.timestamp).toISOString()
    });
  }

  getStream(sessionId: string, taskId: string): ProgressStream | undefined {
    return this.streams.get(`${sessionId}:${taskId}`);
  }

  getActiveStreams(): string[] {
    return Array.from(this.streams.keys());
  }

  async cleanup(sessionId: string): Promise<void> {
    const streamsToRemove = Array.from(this.streams.keys())
      .filter(key => key.startsWith(sessionId));
    
    for (const streamId of streamsToRemove) {
      const stream = this.streams.get(streamId);
      if (stream) {
        await stream.close();
      }
    }
  }
}