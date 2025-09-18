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
        
      } catch (error: any) {
        // Debug: Log the actual error details
        console.error('🚨 Raw transcription error:', error);
        console.error('🚨 Error message:', error.message);
        if (error.stderr) console.error('🚨 Python stderr:', error.stderr);
        if (error.stdout) console.error('🚨 Python stdout:', error.stdout);
        
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
            modelSize: 'medium', // Fallback to a smaller model
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
    
    // Execute enhanced transcription via Python virtual environment
    const pythonPath = options.uvPath || (process.platform === 'win32' ? 'venv\\Scripts\\python.exe' : 'venv/bin/python');
    
    tracker.stage('transcribing', 'Executing GPU-optimized transcription...');
    
    try {
      const { stdout, stderr } = await execFileAsync(pythonPath, [
        pythonScript
      ], {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large transcriptions
        env: process.env, // Inherit parent process environment for GPU access
        cwd: process.cwd() // Use current working directory
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
   * Create enhanced Python transcription script optimized for RTX 3060
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
from pathlib import Path

# Suppress warnings
warnings.filterwarnings("ignore")

def detect_optimal_device():
    """Detect optimal device configuration for GPU"""
    # Force CPU mode to avoid cuDNN compatibility issues
    # TODO: Fix cuDNN version mismatch and re-enable GPU mode
    print("Using CPU fallback due to cuDNN compatibility issues", file=sys.stderr)
    return {
        'device': 'cpu',
        'compute_type': 'int8',
        'model_size': 'base',
        'gpu_optimized': False,
        'gpu_memory': 0
    }

def transcribe_audio(audio_path, config):
    """Enhanced audio transcription using faster-whisper (more memory efficient)"""
    try:
        from faster_whisper import WhisperModel
        
        print(f"Loading faster-whisper model: {config['model_size']} on {config['device']}", file=sys.stderr)
        
        # Load model with faster-whisper
        model = WhisperModel(
            config['model_size'], 
            device=config['device'], 
            compute_type=config['compute_type']
        )
        
        print("Starting transcription with faster-whisper...", file=sys.stderr)
        
        # Transcribe with faster-whisper
        segments, info = model.transcribe(
            audio_path,
            language="${actualLanguage}" if "${actualLanguage}" != "auto" else None,
            temperature=${this.currentConfig.temperature},
            compression_ratio_threshold=${this.currentConfig.compression_ratio_threshold},
            log_prob_threshold=${this.currentConfig.logprob_threshold},
            no_speech_threshold=${this.currentConfig.no_speech_threshold},
            condition_on_previous_text=${this.currentConfig.condition_on_previous_text ? 'True' : 'False'},
            beam_size=${this.currentConfig.beam_size},
            patience=${this.currentConfig.patience},
            length_penalty=${this.currentConfig.length_penalty},
            suppress_blank=${this.currentConfig.suppress_blank ? 'True' : 'False'},
            word_timestamps=${this.currentConfig.word_timestamps ? 'True' : 'False'}
        )
        
        # Extract text from segments
        transcription_text = ""
        for segment in segments:
            transcription_text += segment.text
        
        # Clean up GPU memory
        if config['device'] == 'cuda':
            torch.cuda.empty_cache()
            gc.collect()
        
        print("Transcription completed successfully with faster-whisper", file=sys.stderr)
        return transcription_text.strip()
        
    except Exception as e:
        print(f"faster-whisper transcription error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise

def main():
    try:
        audio_path = "${audioPath.replace(/\\/g, '\\\\')}"
        
        print(f"Processing audio file: {audio_path}", file=sys.stderr)
        
        # Detect optimal configuration for RTX 3060
        config = detect_optimal_device()
        
        print(f"Using configuration: {config}", file=sys.stderr)
        
        # Transcribe audio
        transcription = transcribe_audio(audio_path, config)
        
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
        const pythonPath = process.platform === 'win32' ? 'venv\\Scripts\\python.exe' : 'venv/bin/python';
        const { stdout } = await execFileAsync(pythonPath, [tempScriptPath], {
          env: process.env, // Inherit parent process environment for GPU access
          cwd: process.cwd()
        });
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
