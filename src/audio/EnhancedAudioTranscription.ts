/**
 * Enhanced Audio Transcription Module
 * GPU-optimized transcription with RTX 3060 specific optimizations (12GB VRAM)
 */

import { AudioTranscriptionOptions, TranscriptionResult, TranscriptionConfig, TranscriptionError } from '../types/audio.js';
import { ConfigManager } from './ConfigManager.js';
import { GPUAwareErrorHandler } from './ErrorHandler.js';
import { TranscriptionProgressTracker } from './ProgressReporter.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

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
      
      // Detect optimal GPU configuration
      tracker.stage('detecting_gpu', 'Detecting RTX 3060 GPU configuration...');
      const configSummary = ConfigManager.getConfigSummary(this.currentConfig);
      tracker.update(18, `GPU Config: ${configSummary}`);
      
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
   * Execute the actual transcription using GPU-accelerated Python script
   */
  private async executeTranscription(
    options: AudioTranscriptionOptions,
    tracker: TranscriptionProgressTracker
  ): Promise<string> {
    tracker.stage('loading_model', 'Loading GPU-optimized transcription model...');
    
    // Get the GPU transcription script path
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath = path.join(currentDir, '..', 'gpu_transcribe.py');
    
    tracker.update(40, 'Using faster-whisper GPU script');
    
    // Execute enhanced transcription via UV
    const uvPath = options.uvPath || 'uv';
    
    tracker.stage('transcribing', 'Executing GPU-optimized transcription...');
    
    // Build command arguments
    const args = [
      'run', 'python', scriptPath,
      options.filepath,
      '--format', 'markdown',
      '--model-size', this.currentConfig.modelSize || 'tiny',
      '--device', this.currentConfig.device || 'auto'
    ];
    
    if (options.language) {
      args.push('--language', options.language);
    }
    
    try {
      const { stdout, stderr } = await execFileAsync(uvPath, args, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large transcriptions
        env: {
          ...process.env,
          KMP_DUPLICATE_LIB_OK: 'TRUE',
          OMP_NUM_THREADS: '4'
        }
      });
      
      tracker.update(90, 'Transcription completed, processing results...');
      
      // Return the markdown content directly
      const result = stdout.trim();
      
      if (stderr && !stderr.includes('ResourceWarning') && !stderr.includes('Loading') && !stderr.includes('Model loaded')) {
        console.warn('Transcription stderr:', stderr);
      }
      
      return result;
      
    } catch (error) {
      throw error;
    }
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
}
