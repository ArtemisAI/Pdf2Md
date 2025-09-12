/**
 * Enhanced Audio Module Index
 * RTX 3060 Optimized Audio Transcription System for Pdf2Md MCP Server
 */

export { ConfigManager } from './ConfigManager.js';
export { GPUAwareErrorHandler } from './ErrorHandler.js';
export { ProgressReporter, TranscriptionProgressTracker } from './ProgressReporter.js';
export { TranscriptionQueue, transcribeAudio, getTranscriptionResult, getTaskStatus } from './TranscriptionQueue.js';
export { EnhancedAudioTranscription } from './EnhancedAudioTranscription.js';
export { AudioFileProcessor } from './AudioProcessor.js';

// Re-export types
export type {
  GPUConfig,
  DeviceInfo,
  WhisperModel,
  AudioModelManager,
  TranscriptionTask,
  TranscriptionConfig,
  ProgressCallback,
  AudioProcessor,
  TranscriptionResult,
  AudioTranscriptionOptions
} from '../types/audio.js';

export { TranscriptionError } from '../types/audio.js';
