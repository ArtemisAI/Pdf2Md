/**
 * Configuration Manager for Audio Transcription
 * Optimized for RTX 3060 and GPU detection based on Audio_Transcribe_3 patterns
 */

import { TranscriptionConfig, DeviceInfo, GPUConfig } from '../types/audio.js';

export class ConfigManager {
  /**
   * Get optimal configuration based on hardware detection
   * RTX 3060 specific optimizations included
   */
  static getOptimalConfig(): TranscriptionConfig {
    const deviceInfo = this.detectOptimalDevice();
    
    return {
      // Auto-select model based on GPU capability
      modelSize: this.selectOptimalModel(deviceInfo),
      
      // GPU Configuration (Audio_Transcribe_3 logic)
      device: deviceInfo.device as TranscriptionConfig['device'],
      torch_dtype: deviceInfo.torch_dtype as TranscriptionConfig['torch_dtype'],
      low_cpu_mem_usage: true,
      use_safetensors: true,
      
      // Performance settings based on device
      batch_size: deviceInfo.batch_size,
      chunk_length_s: 30,
      max_new_tokens: 128,
      
      // Quality settings
      language: process.env.WHISPER_DEFAULT_LANGUAGE || 'en',
      temperature: 0.0,
      beam_size: 5,
      patience: 1.0,
      length_penalty: 1.0,
      
      // Thresholds (Audio_Transcribe_3 values)
      compression_ratio_threshold: 2.4,
      logprob_threshold: -1.0,
      no_speech_threshold: 0.6,
      condition_on_previous_text: true,
      
      // Output formatting
      suppress_blank: true,
      suppress_tokens: [-1],
      without_timestamps: false,
      max_initial_timestamp: 1.0,
      word_timestamps: false,
      prepend_punctuations: "\"'([{-",
      append_punctuations: "\"'.,!?:)]};"
    };
  }

  /**
   * Detect optimal device configuration
   * Includes RTX 3060 specific optimizations
   */
  private static detectOptimalDevice(): DeviceInfo {
    const cudaAvailable = this.checkCUDAAvailability();
    const gpuMemory = this.getGPUMemory();
    
    if (cudaAvailable) {
      // RTX 3060 has 12GB VRAM - optimize accordingly
      if (gpuMemory >= 12 || this.isRTX3060()) {
        return {
          device: 'cuda:0',
          torch_dtype: 'float16', // GPU uses float16 for speed
          batch_size: 8, // RTX 3060 optimized batch size
          memory_efficient: true,
          gpu_memory: gpuMemory,
          cuda_available: true
        };
      } else if (gpuMemory >= 8) {
        return {
          device: 'cuda:0',
          torch_dtype: 'float16',
          batch_size: 6, // Lower VRAM GPUs
          memory_efficient: true,
          gpu_memory: gpuMemory,
          cuda_available: true
        };
      }
    }
    
    // CPU fallback
    return {
      device: 'cpu',
      torch_dtype: 'float32', // CPU uses float32
      batch_size: 4, // Smaller batch for CPU
      memory_efficient: false,
      cuda_available: false
    };
  }

  /**
   * Select optimal model based on hardware capabilities
   * RTX 3060 specific optimizations
   */
  private static selectOptimalModel(deviceInfo: DeviceInfo): TranscriptionConfig['modelSize'] {
    if (!deviceInfo.cuda_available) {
      return 'base'; // CPU fallback
    }
    
    const gpuMemory = deviceInfo.gpu_memory || 0;
    
    // GPU memory-based model selection optimized for RTX 3060
    if (gpuMemory >= 24) return 'large-v3';     // RTX 4090/3090 Ti
    if (gpuMemory >= 16) return 'large-v2';     // RTX 4080/3080 Ti
    if (gpuMemory >= 12) return 'medium';       // RTX 3060 (12GB) - optimal choice
    if (gpuMemory >= 8) return 'small';         // RTX 4060/lower VRAM
    
    // For RTX 3060 specifically, prefer 'medium' model
    if (this.isRTX3060()) {
      return 'medium';
    }
    
    return 'base'; // Safe fallback
  }

  /**
   * Check if CUDA is available
   */
  private static checkCUDAAvailability(): boolean {
    // Check environment variables that indicate CUDA availability
    const cudaVisible = process.env.CUDA_VISIBLE_DEVICES !== '';
    const torchCuda = process.env.TORCH_CUDA_AVAILABLE === 'true';
    const nvidiaSmi = process.env.NVIDIA_SMI_AVAILABLE === 'true';
    
    return cudaVisible || torchCuda || nvidiaSmi;
  }

  /**
   * Get GPU memory in GB
   */
  private static getGPUMemory(): number {
    // Try to get GPU memory from environment or default to RTX 3060 specs
    const envMemory = process.env.GPU_MEMORY_GB;
    if (envMemory) {
      return parseInt(envMemory, 10);
    }
    
    // Default assumption for RTX 3060
    if (this.isRTX3060()) {
      return 12;
    }
    
    // Conservative default
    return 8;
  }

  /**
   * Detect if this is an RTX 3060 system
   */
  private static isRTX3060(): boolean {
    const gpuName = process.env.GPU_NAME?.toLowerCase() || '';
    return gpuName.includes('rtx 3060') || gpuName.includes('rtx3060');
  }

  /**
   * Create GPU configuration for model loading
   */
  static createGPUConfig(overrides?: Partial<GPUConfig>): GPUConfig {
    const optimal = this.getOptimalConfig();
    
    return {
      device: optimal.device,
      torch_dtype: optimal.torch_dtype,
      low_cpu_mem_usage: optimal.low_cpu_mem_usage,
      use_safetensors: optimal.use_safetensors,
      batch_size: optimal.batch_size,
      chunk_length_s: optimal.chunk_length_s,
      model_id: `openai/whisper-${optimal.modelSize}`,
      ...overrides
    };
  }

  /**
   * Get RTX 3060 specific optimizations
   */
  static getRTX3060Optimizations(): Partial<TranscriptionConfig> {
    return {
      modelSize: 'medium', // Optimal for 12GB VRAM
      batch_size: 8,       // RTX 3060 optimized
      chunk_length_s: 30,  // Memory efficient
      torch_dtype: 'float16',
      device: 'cuda:0'
    };
  }

  /**
   * Get configuration for CPU fallback
   */
  static getCPUFallbackConfig(): Partial<TranscriptionConfig> {
    return {
      modelSize: 'base',
      batch_size: 4,
      torch_dtype: 'float32',
      device: 'cpu',
      chunk_length_s: 30
    };
  }

  /**
   * Validate configuration
   */
  static validateConfig(config: TranscriptionConfig): boolean {
    // Check required fields
    if (!config.modelSize || !config.device || !config.torch_dtype) {
      return false;
    }
    
    // Validate batch size
    if (config.batch_size < 1 || config.batch_size > 32) {
      return false;
    }
    
    // Validate chunk length
    if (config.chunk_length_s < 10 || config.chunk_length_s > 60) {
      return false;
    }
    
    return true;
  }
}