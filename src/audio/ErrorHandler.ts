/**
 * Enhanced Error Handler with GPU Fallback
 * Based on Audio_Transcribe_3 error handling patterns with RTX 3060 considerations
 */

import { TranscriptionError, AudioModelManager } from '../types/audio.js';

export class GPUAwareErrorHandler {
  /**
   * Handle transcription errors with GPU-aware recovery strategies
   */
  static handle(error: any, context: string): TranscriptionError {
    const errorMessage = error.message || error.toString();
    
    // File system errors
    if (error.code === 'ENOENT') {
      return new TranscriptionError(
        'Audio file not found',
        'FILE_NOT_FOUND',
        false
      );
    }
    
    if (error.code === 'EACCES') {
      return new TranscriptionError(
        'Permission denied accessing audio file',
        'FILE_PERMISSION_ERROR',
        false
      );
    }
    
    // GPU Memory errors - implement Audio_Transcribe_3's fallback strategy
    if (this.isGPUMemoryError(errorMessage)) {
      return new TranscriptionError(
        'GPU memory insufficient, switching to CPU processing',
        'GPU_MEMORY_ERROR',
        true,
        true,  // Requires CPU fallback
        true   // Memory optimization needed
      );
    }
    
    // CUDA device errors
    if (this.isCUDADeviceError(errorMessage)) {
      return new TranscriptionError(
        'GPU device error, falling back to CPU',
        'GPU_DEVICE_ERROR',
        true,
        true
      );
    }
    
    // Model loading errors
    if (this.isModelLoadingError(errorMessage)) {
      return new TranscriptionError(
        'Model loading failed, trying alternative model',
        'MODEL_LOAD_ERROR',
        true,
        false,
        true
      );
    }
    
    // Audio format/decoding errors
    if (this.isAudioFormatError(errorMessage)) {
      return new TranscriptionError(
        'Audio file format not supported or corrupted',
        'DECODE_ERROR',
        false
      );
    }
    
    // Pipeline execution errors
    if (this.isPipelineError(errorMessage)) {
      return new TranscriptionError(
        'Transcription pipeline error, retrying with different settings',
        'PIPELINE_ERROR',
        true,
        false,
        true
      );
    }
    
    // Network/download errors
    if (this.isNetworkError(errorMessage)) {
      return new TranscriptionError(
        'Network error downloading model, check internet connection',
        'NETWORK_ERROR',
        true
      );
    }
    
    // Timeout errors
    if (this.isTimeoutError(errorMessage)) {
      return new TranscriptionError(
        'Transcription timeout, try with smaller audio chunks',
        'TIMEOUT_ERROR',
        true,
        false,
        true
      );
    }
    
    // Python/UV execution errors
    if (this.isPythonExecutionError(errorMessage)) {
      return new TranscriptionError(
        'Python execution error, check dependencies',
        'PYTHON_ERROR',
        true
      );
    }
    
    return new TranscriptionError(
      `Transcription failed: ${errorMessage}`,
      'UNKNOWN_ERROR',
      false
    );
  }
  
  /**
   * Handle error with automatic fallback strategies
   */
  static async handleWithFallback(
    error: TranscriptionError, 
    modelManager?: any
  ): Promise<void> {
    if (error.requiresCPUFallback && modelManager) {
      try {
        await modelManager.switchDevice('cpu');
      } catch (fallbackError) {
        console.warn('Failed to switch to CPU fallback:', fallbackError);
      }
    }
    
    if (error.memoryOptimizationNeeded && modelManager) {
      try {
        await modelManager.optimizeMemory();
      } catch (optimizeError) {
        console.warn('Failed to optimize memory:', optimizeError);
      }
    }
  }
  
  /**
   * Check if error is related to GPU memory
   */
  private static isGPUMemoryError(errorMessage: string): boolean {
    const gpuMemoryPatterns = [
      'CUDA out of memory',
      'RuntimeError: out of memory',
      'OutOfMemoryError',
      'cuda runtime error',
      'CUDNN_STATUS_NOT_ENOUGH_WORKSPACE',
      'GPU memory',
      'VRAM',
      'insufficient memory',
      'memory allocation'
    ];
    
    return gpuMemoryPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Check if error is related to CUDA device
   */
  private static isCUDADeviceError(errorMessage: string): boolean {
    const cudaDevicePatterns = [
      'CUDA error',
      'device-side assert',
      'CUDA_ERROR_LAUNCH_FAILED',
      'CUDA_ERROR_INVALID_DEVICE',
      'No CUDA-capable device',
      'CUDA driver version',
      'cuDNN error',
      'NVIDIA driver'
    ];
    
    return cudaDevicePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Check if error is related to model loading
   */
  private static isModelLoadingError(errorMessage: string): boolean {
    const modelLoadingPatterns = [
      'Failed to load',
      'model',
      'checkpoint',
      'pretrained',
      'weights',
      'HuggingFace',
      'transformers',
      'AutoModel',
      'pipeline creation failed'
    ];
    
    return modelLoadingPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase()) &&
      errorMessage.toLowerCase().includes('load')
    );
  }
  
  /**
   * Check if error is related to audio format
   */
  private static isAudioFormatError(errorMessage: string): boolean {
    const audioFormatPatterns = [
      'Could not decode',
      'pydub.exceptions.CouldntDecodeError',
      'ffmpeg',
      'audio format',
      'codec',
      'Invalid audio',
      'unsupported format',
      'AudioSegmentError'
    ];
    
    return audioFormatPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Check if error is related to pipeline execution
   */
  private static isPipelineError(errorMessage: string): boolean {
    const pipelinePatterns = [
      'pipeline',
      'transformers',
      'forward pass',
      'inference',
      'ASR pipeline',
      'automatic-speech-recognition'
    ];
    
    return pipelinePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Check if error is network related
   */
  private static isNetworkError(errorMessage: string): boolean {
    const networkPatterns = [
      'connection',
      'network',
      'download',
      'HTTP',
      'SSL',
      'certificate',
      'timeout',
      'DNS',
      'resolve',
      'ConnectionError'
    ];
    
    return networkPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Check if error is timeout related
   */
  private static isTimeoutError(errorMessage: string): boolean {
    const timeoutPatterns = [
      'timeout',
      'timed out',
      'time limit',
      'exceeded maximum',
      'hanging'
    ];
    
    return timeoutPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Check if error is Python execution related
   */
  private static isPythonExecutionError(errorMessage: string): boolean {
    const pythonPatterns = [
      'ModuleNotFoundError',
      'ImportError',
      'Python',
      'uv run',
      'subprocess',
      'command not found',
      'No module named'
    ];
    
    return pythonPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: TranscriptionError): string {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        return 'The audio file could not be found. Please check the file path.';
      
      case 'FILE_PERMISSION_ERROR':
        return 'Permission denied. Please check file permissions.';
      
      case 'GPU_MEMORY_ERROR':
        return 'GPU memory insufficient for RTX 3060. Automatically switching to CPU processing.';
      
      case 'GPU_DEVICE_ERROR':
        return 'GPU device error detected. Falling back to CPU processing.';
      
      case 'MODEL_LOAD_ERROR':
        return 'Failed to load the transcription model. Trying alternative model...';
      
      case 'DECODE_ERROR':
        return 'The audio file format is not supported or the file is corrupted. Please use MP3, WAV, FLAC, or similar formats.';
      
      case 'PIPELINE_ERROR':
        return 'Transcription pipeline error. Retrying with optimized settings...';
      
      case 'NETWORK_ERROR':
        return 'Network error while downloading models. Please check your internet connection.';
      
      case 'TIMEOUT_ERROR':
        return 'Transcription timeout. Try processing smaller audio segments.';
      
      case 'PYTHON_ERROR':
        return 'Python execution error. Please ensure all dependencies are installed.';
      
      default:
        return `Transcription failed: ${error.message}`;
    }
  }
  
  /**
   * Get recovery suggestions
   */
  static getRecoverySuggestions(error: TranscriptionError): string[] {
    const suggestions: string[] = [];
    
    switch (error.code) {
      case 'GPU_MEMORY_ERROR':
        suggestions.push('Reducing batch size automatically');
        suggestions.push('Switching to CPU processing');
        suggestions.push('Consider using a smaller model size');
        suggestions.push('For RTX 3060: Using medium model with 8 batch size');
        break;
      
      case 'GPU_DEVICE_ERROR':
        suggestions.push('Switching to CPU fallback');
        suggestions.push('Check CUDA installation if needed');
        suggestions.push('Update NVIDIA drivers for RTX 3060');
        break;
      
      case 'MODEL_LOAD_ERROR':
        suggestions.push('Trying smaller model size');
        suggestions.push('Checking internet connection');
        suggestions.push('Clearing model cache');
        break;
      
      case 'DECODE_ERROR':
        suggestions.push('Try converting audio to WAV or MP3 format');
        suggestions.push('Check if file is corrupted');
        break;
      
      case 'TIMEOUT_ERROR':
        suggestions.push('Processing smaller audio chunks');
        suggestions.push('Using more efficient model settings');
        break;
    }
    
    return suggestions;
  }
}
