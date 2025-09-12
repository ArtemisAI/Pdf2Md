/**
 * Enhanced Audio Transcription Module
 * GPU-optimized transcription with RTX 3060 specific optimizations
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
    const taskId = `transcribe_${Date.now()}`;
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
      
      // Execute transcription with fallback handling
      tracker.stage('starting_transcription');
      const result = await this.executeTranscriptionWithFallback(options, tracker);
      
      tracker.complete('Enhanced transcription completed successfully');
      
      return {
        taskId,
        text: result,
        path: options.filepath,
        duration,
        language: options.language
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
          tracker.stage('optimizing_memory', 'Optimizing memory settings...');
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
    tracker.stage('loading_model', 'Loading optimized transcription model...');
    
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
   * Create enhanced Python transcription script
   */
  private async createEnhancedTranscriptionScript(audioPath: string, language?: string): Promise<string> {
    const actualLanguage = language || this.currentConfig.language;
    const scriptContent = `
import sys
import torch
import torchaudio
import warnings
from transformers import pipeline, AutoModelForSpeechSeq2Seq, AutoProcessor
import json
import os
from pathlib import Path

# Suppress warnings
warnings.filterwarnings("ignore")

def detect_optimal_device():
    """Detect optimal device configuration for RTX 3060"""
    if torch.cuda.is_available():
        device = "cuda:0"
        torch_dtype = torch.float16
        gpu_props = torch.cuda.get_device_properties(0)
        gpu_memory = gpu_props.total_memory / (1024**3)
        
        # RTX 3060 specific optimizations
        if gpu_memory >= 12:  # RTX 3060 12GB
            return {
                'device': device,
                'torch_dtype': torch_dtype,
                'batch_size': ${this.currentConfig.batch_size},
                'model_size': '${this.currentConfig.modelSize}'
            }
        elif gpu_memory >= 8:
            return {
                'device': device,
                'torch_dtype': torch_dtype,
                'batch_size': ${Math.max(4, this.currentConfig.batch_size - 2)},
                'model_size': 'small'
            }
    
    # CPU fallback
    return {
        'device': 'cpu',
        'torch_dtype': torch.float32,
        'batch_size': 4,
        'model_size': 'base'
    }

def transcribe_audio(audio_path, config):
    """Enhanced audio transcription with GPU optimization"""
    try:
        model_id = f"openai/whisper-{config['model_size']}"
        
        # Load model with optimized settings
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            model_id,
            torch_dtype=config['torch_dtype'],
            low_cpu_mem_usage=True,
            use_safetensors=True
        )
        model.to(config['device'])
        
        processor = AutoProcessor.from_pretrained(model_id)
        
        # Create optimized pipeline
        pipe = pipeline(
            "automatic-speech-recognition",
            model=model,
            tokenizer=processor.tokenizer,
            feature_extractor=processor.feature_extractor,
            max_new_tokens=${this.currentConfig.max_new_tokens},
            chunk_length_s=${this.currentConfig.chunk_length_s},
            batch_size=config['batch_size'],
            torch_dtype=config['torch_dtype'],
            device=config['device'],
            return_timestamps=${this.currentConfig.without_timestamps ? 'False' : 'True'}
        )
        
        # Transcribe audio
        result = pipe(
            audio_path,
            generate_kwargs={
                "language": "${actualLanguage}",
                "temperature": ${this.currentConfig.temperature},
                "compression_ratio_threshold": ${this.currentConfig.compression_ratio_threshold},
                "logprob_threshold": ${this.currentConfig.logprob_threshold},
                "no_speech_threshold": ${this.currentConfig.no_speech_threshold},
                "condition_on_previous_text": ${this.currentConfig.condition_on_previous_text}
            }
        )
        
        # Clean up GPU memory
        if config['device'].startswith('cuda'):
            torch.cuda.empty_cache()
        
        return result["text"]
        
    except Exception as e:
        print(f"Transcription error: {str(e)}", file=sys.stderr)
        raise

def main():
    try:
        audio_path = "${audioPath.replace(/\\/g, '\\\\')}"
        
        # Detect optimal configuration
        config = detect_optimal_device()
        
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
    
    const tempScriptPath = path.join(os.tmpdir(), `enhanced_transcription_${Date.now()}.py`);
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
      if (line && !line.startsWith('Loading') && !line.startsWith('Using')) {
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
    const supportedExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.mp4'];
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
        ], capture_output=True, text=True)
        
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
}