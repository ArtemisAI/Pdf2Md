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
   * Create enhanced Python transcription script optimized for RTX 3060
   */
  private async createEnhancedTranscriptionScript(audioPath: string, language?: string): Promise<string> {
    const actualLanguage = language || this.currentConfig.language;
    const scriptContent = `
import sys
import warnings
import os
import gc
from pathlib import Path
import time

# Import faster-whisper for GPU acceleration (19.4x performance proven)
try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
    print("Using faster-whisper for GPU acceleration", file=sys.stderr)
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    print("faster-whisper not available, falling back to transformers", file=sys.stderr)
    import torch
    from transformers import pipeline, AutoModelForSpeechSeq2Seq, AutoProcessor

# Suppress warnings
warnings.filterwarnings("ignore")

def detect_optimal_device():
    """Detect optimal device configuration for RTX 3060 (12GB VRAM)"""
    if not FASTER_WHISPER_AVAILABLE:
        return detect_transformers_device()
    
    # faster-whisper GPU detection
    try:
        import torch
        if torch.cuda.is_available():
            gpu_props = torch.cuda.get_device_properties(0)
            gpu_memory = gpu_props.total_memory / (1024**3)
            gpu_name = gpu_props.name.lower()
            
            print(f"Detected GPU: {gpu_props.name} with {gpu_memory:.1f}GB VRAM", file=sys.stderr)
            
            # RTX 3060 specific optimizations for faster-whisper
            if "rtx 3060" in gpu_name or gpu_memory >= 12:
                return {
                    'device': 'cuda',
                    'device_index': 0,
                    'compute_type': 'float16',
                    'model_size': '${this.currentConfig.modelSize}',
                    'gpu_optimized': True,
                    'beam_size': ${this.currentConfig.beam_size || 5},
                    'gpu_memory': gpu_memory
                }
            elif gpu_memory >= 8:
                return {
                    'device': 'cuda',
                    'device_index': 0,
                    'compute_type': 'float16',
                    'model_size': 'small',
                    'gpu_optimized': True,
                    'beam_size': ${this.currentConfig.beam_size || 5},
                    'gpu_memory': gpu_memory
                }
            elif gpu_memory >= 6:
                return {
                    'device': 'cuda',
                    'device_index': 0,
                    'compute_type': 'float16',
                    'model_size': 'base',
                    'gpu_optimized': True,
                    'beam_size': ${this.currentConfig.beam_size || 5},
                    'gpu_memory': gpu_memory
                }
        
    except Exception as e:
        print(f"GPU detection error: {e}", file=sys.stderr)
    
    # CPU fallback for faster-whisper
    print("Using CPU fallback with faster-whisper", file=sys.stderr)
    return {
        'device': 'cpu',
        'device_index': None,
        'compute_type': 'int8',
        'model_size': '${this.currentConfig.modelSize}' if '${this.currentConfig.modelSize}' in ['tiny', 'base'] else 'base',
        'gpu_optimized': False,
        'beam_size': ${this.currentConfig.beam_size || 5}
    }

def detect_transformers_device():
    """Fallback device detection for transformers"""
    try:
        import torch
        if torch.cuda.is_available():
            device = "cuda:0"
            torch_dtype = torch.float16
            
            gpu_props = torch.cuda.get_device_properties(0)
            gpu_memory = gpu_props.total_memory / (1024**3)
            
            return {
                'device': device,
                'torch_dtype': torch_dtype,
                'batch_size': ${this.currentConfig.batch_size},
                'model_size': '${this.currentConfig.modelSize}',
                'gpu_optimized': True,
                'gpu_memory': gpu_memory
            }
    except:
        pass
    
    return {
        'device': 'cpu',
        'torch_dtype': 'float32',
        'batch_size': 4,
        'model_size': 'base',
        'gpu_optimized': False
    }

def transcribe_audio_faster_whisper(audio_path, config):
    """GPU-accelerated transcription using faster-whisper (19.4x performance)"""
    try:
        print(f"Loading faster-whisper model: {config['model_size']}", file=sys.stderr)
        
        start_time = time.time()
        
        # Initialize faster-whisper model with GPU acceleration
        model = WhisperModel(
            config['model_size'],
            device=config['device'],
            device_index=config.get('device_index'),
            compute_type=config['compute_type'],
            # CPU threads for CPU mode or when device_index is None
            cpu_threads=4 if config['device'] == 'cpu' else 0
        )
        
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.2f}s", file=sys.stderr)
        
        print("Starting faster-whisper transcription...", file=sys.stderr)
        transcribe_start = time.time()
        
        # Transcribe with optimal settings for RTX 3060
        segments, info = model.transcribe(
            audio_path,
            language="${actualLanguage}" if "${actualLanguage}" != "auto" else None,
            beam_size=config['beam_size'],
            temperature=${this.currentConfig.temperature},
            compression_ratio_threshold=${this.currentConfig.compression_ratio_threshold},
            log_prob_threshold=${this.currentConfig.logprob_threshold},
            no_speech_threshold=${this.currentConfig.no_speech_threshold},
            condition_on_previous_text=${this.currentConfig.condition_on_previous_text ? 'True' : 'False'},
            word_timestamps=${this.currentConfig.word_timestamps ? 'True' : 'False'},
            prepend_punctuations="${this.currentConfig.prepend_punctuations || ''}",
            append_punctuations="${this.currentConfig.append_punctuations || ''}"
        )
        
        # Collect transcription text
        transcription = ""
        for segment in segments:
            transcription += segment.text
        
        transcribe_time = time.time() - transcribe_start
        total_time = time.time() - start_time
        
        print(f"Transcription completed in {transcribe_time:.2f}s (total: {total_time:.2f}s)", file=sys.stderr)
        print(f"Language detected: {info.language} (confidence: {info.language_probability:.2f})", file=sys.stderr)
        
        # Clean up GPU memory if using CUDA
        if config['device'] == 'cuda':
            import torch
            torch.cuda.empty_cache()
            gc.collect()
        
        return transcription.strip()
        
    except Exception as e:
        print(f"faster-whisper transcription error: {str(e)}", file=sys.stderr)
        raise

def transcribe_audio_transformers(audio_path, config):
    """Fallback transcription using transformers"""
    try:
        import torch
        
        model_id = f"openai/whisper-{config['model_size']}"
        print(f"Loading transformers model: {model_id}", file=sys.stderr)
        
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
            gc.collect()
        
        return result["text"]
        
    except Exception as e:
        print(f"Transformers transcription error: {str(e)}", file=sys.stderr)
        raise

def transcribe_audio(audio_path, config):
    """Main transcription function with faster-whisper priority and transformers fallback"""
    try:
        if FASTER_WHISPER_AVAILABLE:
            return transcribe_audio_faster_whisper(audio_path, config)
        else:
            return transcribe_audio_transformers(audio_path, config)
    except Exception as e:
        # If faster-whisper fails, try transformers as fallback
        if FASTER_WHISPER_AVAILABLE:
            print(f"faster-whisper failed, trying transformers fallback: {e}", file=sys.stderr)
            try:
                fallback_config = detect_transformers_device()
                return transcribe_audio_transformers(audio_path, fallback_config)
            except Exception as fallback_error:
                print(f"Transformers fallback also failed: {fallback_error}", file=sys.stderr)
                raise e
        else:
            raise e

def main():
    try:
        audio_path = "${audioPath.replace(/\\/g, '\\\\')}"
        
        print(f"Processing audio file: {audio_path}", file=sys.stderr)
        
        # Detect optimal configuration for RTX 3060 with faster-whisper
        config = detect_optimal_device()
        
        print(f"Using configuration: {config}", file=sys.stderr)
        print(f"faster-whisper available: {FASTER_WHISPER_AVAILABLE}", file=sys.stderr)
        
        # Transcribe audio with GPU acceleration priority
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
      if (line && 
          !line.startsWith('Loading') && 
          !line.startsWith('Using') && 
          !line.startsWith('Detected') && 
          !line.startsWith('Creating') &&
          !line.startsWith('Model loaded') &&
          !line.startsWith('Starting') &&
          !line.startsWith('Transcription completed') &&
          !line.startsWith('Language detected') &&
          !line.startsWith('faster-whisper') &&
          !line.includes('available:') &&
          !line.includes('configuration:')) {
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
}
