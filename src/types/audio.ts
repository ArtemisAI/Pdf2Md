/**
 * Audio transcription types and interfaces
 * Based on Audio_Transcribe_3 architecture patterns with RTX 3060 optimizations
 */

export interface GPUConfig {
  device: 'auto' | 'cpu' | 'cuda' | 'cuda:0' | 'cuda:1';
  torch_dtype: 'auto' | 'float16' | 'float32' | 'bfloat16';
  low_cpu_mem_usage: boolean;
  use_safetensors: boolean;
  batch_size: number;
  chunk_length_s: number;
  model_id?: string;
}

export interface DeviceInfo {
  device: string;
  torch_dtype: string;
  batch_size: number;
  memory_efficient: boolean;
  gpu_memory?: number;
  cuda_available?: boolean;
}

export interface WhisperModel {
  model: any;
  pipeline: any;
  processor?: any;
}

export interface AudioModelManager {
  loadModel(config?: GPUConfig): Promise<void>;
  isModelLoaded(): boolean;
  getModel(): WhisperModel | null;
  unloadModel(): void;
  switchDevice(device: 'cuda' | 'cpu'): Promise<void>;
  getDeviceInfo(): DeviceInfo;
  optimizeMemory(): Promise<void>;
}

export interface TranscriptionTask {
  id: string;
  filePath: string;
  language: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  config?: TranscriptionConfig;
}

export interface TranscriptionConfig {
  // Model Configuration
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3';
  
  // GPU/Device Configuration (Audio_Transcribe_3 patterns)
  device: 'auto' | 'cpu' | 'cuda' | 'cuda:0' | 'cuda:1';
  torch_dtype: 'auto' | 'float16' | 'float32' | 'bfloat16';
  low_cpu_mem_usage: boolean;
  use_safetensors: boolean;
  
  // Performance Optimization (RTX 3060 specific)
  batch_size: number;          // 8 for RTX 3060, 6 for other GPUs, 4 for CPU
  chunk_length_s: number;      // 30 seconds for memory efficiency
  max_new_tokens: number;      // 128 tokens for faster processing
  
  // Language and Processing
  language: string;
  temperature: number;
  beam_size: number;
  patience: number;
  length_penalty: number;
  
  // Quality vs Speed Trade-offs
  compression_ratio_threshold: number;
  logprob_threshold: number;
  no_speech_threshold: number;
  condition_on_previous_text: boolean;
  initial_prompt?: string;
  
  // Memory Management
  suppress_blank: boolean;
  suppress_tokens: number[];
  without_timestamps: boolean;
  max_initial_timestamp: number;
  word_timestamps: boolean;
  
  // Audio Processing
  prepend_punctuations: string;
  append_punctuations: string;
}

export interface ProgressCallback {
  (taskId: string, progress: number, message: string, isError?: boolean): void;
}

export interface AudioProcessor {
  validateFormat(filePath: string): Promise<boolean>;
  getDuration(filePath: string): Promise<number>;
  convertIfNeeded(filePath: string): Promise<string>;
}

export class TranscriptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public requiresCPUFallback: boolean = false,
    public memoryOptimizationNeeded: boolean = false
  ) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export interface TranscriptionResult {
  taskId: string;
  text: string;
  path: string;
  duration?: number;
  language?: string;
  confidence?: number;
}

export interface AudioTranscriptionOptions {
  filepath: string;
  language?: string;
  config?: Partial<TranscriptionConfig>;
  progressCallback?: ProgressCallback;
  uvPath?: string;
}
