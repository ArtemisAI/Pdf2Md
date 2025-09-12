/**
 * Enhanced Audio Transcription Module
 * GPU-optimized transcription with RTX 3060 specific optimizations (12GB VRAM)
 */

import { AudioTranscriptionOptions, TranscriptionResult, TranscriptionConfig, TranscriptionError } from '../types/audio.js';
import { ConfigManager } from './ConfigManager.js';
import { GPUAwareErrorHandler } from './ErrorHandler.js';
import { TranscriptionProgressTracker } from './ProgressReporter.js';
import { detectGPU, getOptimalFasterWhisperConfig } from '../utils.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = promisify(execFile);

export class EnhancedAudioTranscription {
  private static modelManager: any = null;
  private static isModelLoaded = false;
  private currentConfig: TranscriptionConfig;
  
  constructor(config?: Partial<TranscriptionConfig>) {
    this.currentConfig = config ? 
      { ...ConfigManager.getOptimalConfig(), ...config } : 
      ConfigManager.getOptimalConfig();
  }
  
  /**
   * Transcribe audio file with enhanced GPU-aware processing
   */
  async transcribe(options: AudioTranscriptionOptions): Promise<TranscriptionResult> {
    const taskId = `enhanced_transcribe_${Date.now()}`;
    const tracker = new TranscriptionProgressTracker(taskId);
    
    try {
      // Subscribe to progress callback if provided
      if (options.progressCallback) {
        tracker.subscribe(options.progressCallback);
      }
      
      tracker.stage('initializing', 'Starting enhanced audio transcription...');
      
      // Validate input
      await this.validateInput(options.filepath);
      tracker.update(10, 'Input validation completed');
      
      // Get audio duration for progress tracking
      const duration = await this.getAudioDuration(options.filepath);
      tracker.update(15, `Audio duration: ${duration.toFixed(1)}s`);
      
      // Detect optimal GPU configuration using faster-whisper
      tracker.stage('detecting_gpu', 'Detecting GPU configuration for faster-whisper...');
      const gpuInfo = await detectGPU(options.uvPath || 'uv');
      const optimalConfig = await getOptimalFasterWhisperConfig(options.uvPath || 'uv');
      
      tracker.update(18, `GPU: ${gpuInfo.name || 'CPU'} | Device: ${optimalConfig.device} | Model: ${optimalConfig.modelSize}`);
      
      if (gpuInfo.isRTX3060) {
        tracker.update(20, 'RTX 3060 detected - targeting 19.4x real-time performance');
      }
      
      // Execute transcription with fallback handling
      tracker.stage('starting_transcription');
      const result = await this.executeTranscriptionWithFallback(options, tracker);
      
      tracker.complete('Enhanced transcription completed successfully');
      
      return {
        taskId,
        text: result,
        path: options.filepath,
        duration,
        language: options.language || this.currentConfig.language
      };
      
    } catch (error) {
      const transcriptionError = GPUAwareErrorHandler.handle(error, 'EnhancedAudioTranscription');
      tracker.error(transcriptionError);
      throw transcriptionError;
    }
  }
  
  /**
   * Execute transcription with GPU fallback capabilities
   */
  private async executeTranscriptionWithFallback(
    options: AudioTranscriptionOptions, 
    tracker: TranscriptionProgressTracker
  ): Promise<string> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        tracker.update(25 + (attempts - 1) * 10, `Transcription attempt ${attempts}/${maxAttempts}`);
        
        // Try transcription with current configuration
        return await this.executeTranscription(options, tracker);
        
      } catch (error) {
        const transcriptionError = GPUAwareErrorHandler.handle(error, `Attempt ${attempts}`);
        
        tracker.update(20 + attempts * 15, `Attempt ${attempts} failed: ${transcriptionError.message}`);
        
        // Handle fallback strategies
        if (transcriptionError.requiresCPUFallback && attempts < maxAttempts) {
          tracker.stage('switching_to_cpu', 'GPU error detected, switching to CPU fallback...');
          this.currentConfig = {
            ...this.currentConfig,
            ...ConfigManager.getCPUFallbackConfig()
          };
          continue;
        }
        
        if (transcriptionError.memoryOptimizationNeeded && attempts < maxAttempts) {
          tracker.stage('optimizing_memory', 'Optimizing memory settings for RTX 3060...');
          this.currentConfig = {
            ...this.currentConfig,
            batch_size: Math.max(1, Math.floor(this.currentConfig.batch_size / 2)),
            chunk_length_s: Math.min(60, this.currentConfig.chunk_length_s + 10)
          };
          continue;
        }
        
        if (attempts === maxAttempts) {
          throw transcriptionError;
        }
      }
    }
    
    throw new Error('Max transcription attempts exceeded');
  }
  
  /**
   * Execute the actual transcription using UV and Python
   */
  private async executeTranscription(
    options: AudioTranscriptionOptions,
    tracker: TranscriptionProgressTracker
  ): Promise<string> {
    tracker.stage('loading_model', 'Loading RTX 3060 optimized transcription model...');
    
    // Create Python script for enhanced transcription
    const pythonScript = await this.createEnhancedTranscriptionScript(options.filepath, options.language);
    
    tracker.update(40, 'Python transcription script prepared');
    
    // Execute enhanced transcription via UV
    const uvPath = options.uvPath || 'uv';
    
    tracker.stage('transcribing', 'Executing GPU-optimized transcription...');
    
    try {
      const { stdout, stderr } = await execFileAsync(uvPath, [
        'run',
        'python',
        pythonScript
      ], {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large transcriptions
      });
      
      // Clean up temporary script
      await fs.promises.unlink(pythonScript);
      
      tracker.update(90, 'Transcription completed, processing results...');
      
      // Parse result
      const result = this.parseTranscriptionResult(stdout);
      
      if (stderr && !stderr.includes('ResourceWarning')) {
        console.warn('Transcription stderr:', stderr);
      }
      
      return result;
      
    } catch (error) {
      // Clean up on error
      try {
        await fs.promises.unlink(pythonScript);
      } catch {}
      
      throw error;
    }
  }
  
  /**
   * Create enhanced Python transcription script using faster-whisper for RTX 3060
   */
  private async createEnhancedTranscriptionScript(audioPath: string, language?: string): Promise<string> {
    const actualLanguage = language || this.currentConfig.language;
    const scriptContent = `
import sys
import torch
import warnings
import json
import os
import gc
import time
from pathlib import Path
from faster_whisper import WhisperModel

# Suppress warnings
warnings.filterwarnings("ignore")

def detect_optimal_device():
    """Detect optimal device configuration for RTX 3060 (12GB VRAM) using faster-whisper"""
    if torch.cuda.is_available():
        try:
            gpu_props = torch.cuda.get_device_properties(0)
            gpu_memory = gpu_props.total_memory / (1024**3)
            gpu_name = gpu_props.name.lower()
            
            print(f"Detected GPU: {gpu_props.name} with {gpu_memory:.1f}GB VRAM", file=sys.stderr)
            
            # RTX 3060 specific optimizations (19.4x target performance)
            if "rtx 3060" in gpu_name or (gpu_memory >= 11.5 and gpu_memory <= 12.5):
                return {
                    'device': 'cuda',
                    'compute_type': 'float16',
                    'model_size': '${this.currentConfig.modelSize}',
                    'batch_size': ${this.currentConfig.batch_size},
                    'beam_size': 1,  # Fastest decoding for 19.4x performance
                    'cpu_threads': 0,  # Use GPU only
                    'gpu_optimized': True,
                    'device_index': 0
                }
            elif gpu_memory >= 8:
                return {
                    'device': 'cuda',
                    'compute_type': 'float16',
                    'model_size': 'small',
                    'batch_size': ${Math.max(4, this.currentConfig.batch_size - 2)},
                    'beam_size': 1,
                    'cpu_threads': 0,
                    'gpu_optimized': True,
                    'device_index': 0
                }
            elif gpu_memory >= 6:
                return {
                    'device': 'cuda',
                    'compute_type': 'float16',
                    'model_size': 'base',
                    'batch_size': 4,
                    'beam_size': 1,
                    'cpu_threads': 0,
                    'gpu_optimized': True,
                    'device_index': 0
                }
            else:
                # Low memory GPU
                return {
                    'device': 'cuda',
                    'compute_type': 'int8',
                    'model_size': 'tiny',
                    'batch_size': 2,
                    'beam_size': 1,
                    'cpu_threads': 0,
                    'gpu_optimized': True,
                    'device_index': 0
                }
        except Exception as e:
            print(f"GPU detection error: {e}", file=sys.stderr)
    
    # CPU fallback
    print("Using CPU fallback", file=sys.stderr)
    return {
        'device': 'cpu',
        'compute_type': 'int8',
        'model_size': 'base',
        'batch_size': 4,
        'beam_size': 1,
        'cpu_threads': 4,
        'gpu_optimized': False,
        'device_index': None
    }

def transcribe_audio_faster_whisper(audio_path, config):
    """Enhanced audio transcription using faster-whisper for RTX 3060"""
    try:
        model_size = config['model_size']
        print(f"Loading faster-whisper model: {model_size}", file=sys.stderr)
        
        start_time = time.time()
        
        # Initialize faster-whisper model with RTX 3060 optimizations
        model = WhisperModel(
            model_size,
            device=config['device'],
            compute_type=config['compute_type'],
            cpu_threads=config['cpu_threads'],
            device_index=config.get('device_index', 0) if config['device'] == 'cuda' else None,
            download_root=None,  # Use default cache
            local_files_only=False
        )
        
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.2f}s", file=sys.stderr)
        
        print("Starting faster-whisper transcription...", file=sys.stderr)
        
        transcription_start = time.time()
        
        # Transcribe with RTX 3060 optimized settings
        segments, info = model.transcribe(
            audio_path,
            language="${actualLanguage}" if "${actualLanguage}" != "auto" else None,
            beam_size=config['beam_size'],
            best_of=1,  # Fastest setting
            temperature=${this.currentConfig.temperature},
            compression_ratio_threshold=${this.currentConfig.compression_ratio_threshold},
            log_prob_threshold=${this.currentConfig.logprob_threshold},
            no_speech_threshold=${this.currentConfig.no_speech_threshold},
            condition_on_previous_text=${this.currentConfig.condition_on_previous_text},
            initial_prompt="${this.currentConfig.initial_prompt || ''}",
            word_timestamps=${this.currentConfig.word_timestamps},
            prepend_punctuations="${this.currentConfig.prepend_punctuations}",
            append_punctuations="${this.currentConfig.append_punctuations}",
            vad_filter=True,  # Voice activity detection for better quality
            vad_parameters={
                "min_silence_duration_ms": 500,
                "speech_pad_ms": 400
            }
        )
        
        # Collect all segments
        transcription_text = ""
        for segment in segments:
            transcription_text += segment.text + " "
        
        transcription_time = time.time() - transcription_start
        
        print(f"Transcription completed in {transcription_time:.2f}s", file=sys.stderr)
        print(f"Audio duration: {info.duration:.2f}s", file=sys.stderr)
        
        if info.duration > 0:
            real_time_factor = info.duration / transcription_time
            print(f"Real-time factor: {real_time_factor:.1f}x", file=sys.stderr)
            
            # Log RTX 3060 performance achievement
            if config['gpu_optimized'] and real_time_factor > 15:
                print(f"RTX 3060 GPU acceleration achieved: {real_time_factor:.1f}x real-time", file=sys.stderr)
        
        # Clean up GPU memory
        if config['device'] == 'cuda':
            torch.cuda.empty_cache()
            gc.collect()
        
        print("Transcription completed successfully", file=sys.stderr)
        return transcription_text.strip()
        
    except Exception as e:
        print(f"faster-whisper transcription error: {str(e)}", file=sys.stderr)
        raise

def main():
    try:
        audio_path = "${audioPath.replace(/\\/g, '\\\\')}"
        
        print(f"Processing audio file with faster-whisper: {audio_path}", file=sys.stderr)
        
        # Detect optimal configuration for RTX 3060
        config = detect_optimal_device()
        
        print(f"Using faster-whisper configuration: {config}", file=sys.stderr)
        
        # Transcribe audio using faster-whisper
        transcription = transcribe_audio_faster_whisper(audio_path, config)
        
        # Output result
        print(transcription)
        
    except Exception as e:
        print(f"Script error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
    
    const tempScriptPath = path.join(os.tmpdir(), `enhanced_rtx3060_transcription_${Date.now()}.py`);
    await fs.promises.writeFile(tempScriptPath, scriptContent);
    
    return tempScriptPath;
  }
  
  /**
   * Parse transcription result from Python output
   */
  private parseTranscriptionResult(stdout: string): string {
    const lines = stdout.trim().split('\n');
    
    // The last non-empty line should be the transcription
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line && !line.startsWith('Loading') && !line.startsWith('Using') && 
          !line.startsWith('Detected') && !line.startsWith('Creating')) {
        return line;
      }
    }
    
    throw new Error('No transcription result found in output');
  }
  
  /**
   * Validate input file
   */
  private async validateInput(filepath: string): Promise<void> {
    // Check if file exists
    try {
      await fs.promises.access(filepath);
    } catch {
      throw new Error(`Audio file not found: ${filepath}`);
    }
    
    // Check file size
    const stats = await fs.promises.stat(filepath);
    const sizeMB = stats.size / (1024 * 1024);
    
    if (sizeMB > 500) { // 500MB limit
      throw new Error(`Audio file too large: ${sizeMB.toFixed(1)}MB (max 500MB)`);
    }
    
    // Check file extension
    const supportedExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.mp4', '.webm'];
    const ext = path.extname(filepath).toLowerCase();
    
    if (!supportedExtensions.includes(ext)) {
      throw new Error(`Unsupported audio format: ${ext}. Supported: ${supportedExtensions.join(', ')}`);
    }
  }
  
  /**
   * Get audio duration using Python/ffprobe
   */
  private async getAudioDuration(filepath: string): Promise<number> {
    try {
      const durationScript = `
import sys
import subprocess
import json

def get_duration(file_path):
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json', 
            '-show_format', file_path
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return 0  # Could not determine duration
            
        data = json.loads(result.stdout)
        duration = float(data['format']['duration'])
        return duration
    except:
        return 0

if __name__ == "__main__":
    duration = get_duration("${filepath.replace(/\\/g, '\\\\')}")
    print(duration)
`;
      
      const tempScriptPath = path.join(os.tmpdir(), `duration_${Date.now()}.py`);
      await fs.promises.writeFile(tempScriptPath, durationScript);
      
      try {
        const { stdout } = await execFileAsync('uv', ['run', 'python', tempScriptPath]);
        await fs.promises.unlink(tempScriptPath);
        
        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? 0 : duration;
      } catch {
        await fs.promises.unlink(tempScriptPath);
        return 0; // Fallback if duration detection fails
      }
    } catch {
      return 0;
    }
  }
  
  /**
   * Get current configuration
   */
  getConfig(): TranscriptionConfig {
    return { ...this.currentConfig };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<TranscriptionConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
  }
  
  /**
   * Reset to optimal configuration
   */
  resetToOptimalConfig(): void {
    this.currentConfig = ConfigManager.getOptimalConfig();
  }
  
  /**
   * Get RTX 3060 specific settings
   */
  static getRTX3060OptimizedConfig(): Partial<TranscriptionConfig> {
    return ConfigManager.getRTX3060Optimizations();
  }
  
  /**
   * Get GPU information and optimal faster-whisper configuration
   */
  static async getGPUInfo(uvPath: string = 'uv') {
    const gpuInfo = await detectGPU(uvPath);
    const optimalConfig = await getOptimalFasterWhisperConfig(uvPath);
    
    return {
      gpu: gpuInfo,
      config: optimalConfig,
      expectedPerformance: gpuInfo.isRTX3060 ? '19.4x real-time' : 
                          gpuInfo.available ? '5-10x real-time' : '2x real-time'
    };
  }
}
