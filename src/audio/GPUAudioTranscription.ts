/**
 * GPU-Only Audio Transcription
 * Dedicated GPU-based audio transcription using faster-whisper with CUDA optimizations
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = promisify(execFile);

export interface GPUTranscriptionConfig {
  modelSize?: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3';
  language?: string;
  device?: 'cuda' | 'cuda:0' | 'cuda:1';
  computeType?: 'float16' | 'float32';
  batchSize?: number;
}

export class GPUAudioTranscription {
  private tempDir: string;

  constructor() {
    this.tempDir = os.tmpdir();
  }

  /**
   * Check GPU availability and compatibility
   */
  async checkGPUAvailability(): Promise<{
    available: boolean;
    gpuName?: string;
    gpuMemory?: number;
    cudaVersion?: string;
    error?: string;
  }> {
    try {
      const scriptPath = await this.createGPUCheckScript();
      const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python');
      
      const { stdout, stderr } = await execFileAsync(venvPython, [scriptPath], {
        env: process.env,
        timeout: 30000
      });

      await fs.promises.unlink(scriptPath).catch(() => {});

      if (stderr && stderr.includes('error')) {
        return { available: false, error: stderr };
      }

      const result = JSON.parse(stdout.trim());
      return result;

    } catch (error) {
      return { available: false, error: `GPU check failed: ${error}` };
    }
  }

  /**
   * Transcribe audio file using GPU-accelerated faster-whisper
   */
  async transcribe(
    filePath: string,
    options: GPUTranscriptionConfig = {}
  ): Promise<{ 
    text: string; 
    processingTime: number; 
    modelUsed: string;
    device: string;
    gpuMemoryUsed?: number;
  }> {
    const startTime = Date.now();
    
    // Validate input file
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    // Check GPU availability first
    const gpuCheck = await this.checkGPUAvailability();
    if (!gpuCheck.available) {
      throw new Error(`GPU not available: ${gpuCheck.error}`);
    }

    const config = {
      modelSize: options.modelSize || 'base',
      language: options.language || 'en',
      device: options.device || 'cuda',
      computeType: options.computeType || 'float16',
      batchSize: options.batchSize || 8
    };

    console.error(`[GPU_TRANSCRIBE] Using GPU transcription with model: ${config.modelSize} on ${config.device}`);
    console.error(`[GPU_TRANSCRIBE] GPU: ${gpuCheck.gpuName} (${gpuCheck.gpuMemory}GB)`);

    // Create Python transcription script
    const scriptPath = await this.createGPUTranscriptionScript(filePath, config);
    const outputPath = path.join(this.tempDir, `gpu_transcript_${Date.now()}.txt`);

    try {
      // Execute GPU transcription using direct venv
      const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python');
      const { stdout, stderr } = await execFileAsync(venvPython, [scriptPath, outputPath], {
        env: process.env,
        timeout: 600000 // 10 minute timeout for large models
      });

      if (stderr) {
        console.error(`[GPU_TRANSCRIBE] Python stderr: ${stderr}`);
        
        // Check for specific GPU errors
        if (stderr.includes('CUDA out of memory') || stderr.includes('cuDNN') || stderr.includes('Invalid handle')) {
          throw new Error(`GPU memory or compatibility error: ${stderr}`);
        }
      }

      // Read transcription result
      if (!fs.existsSync(outputPath)) {
        throw new Error('GPU transcription failed to generate output file');
      }

      const transcriptionText = await fs.promises.readFile(outputPath, 'utf-8');
      
      // Cleanup
      await Promise.all([
        fs.promises.unlink(scriptPath).catch(() => {}),
        fs.promises.unlink(outputPath).catch(() => {})
      ]);

      const processingTime = Date.now() - startTime;
      
      return {
        text: transcriptionText.trim(),
        processingTime,
        modelUsed: config.modelSize,
        device: config.device,
        gpuMemoryUsed: gpuCheck.gpuMemory
      };

    } catch (error) {
      // Cleanup on error
      await Promise.all([
        fs.promises.unlink(scriptPath).catch(() => {}),
        fs.promises.unlink(outputPath).catch(() => {})
      ]);
      
      throw new Error(`GPU transcription failed: ${error}`);
    }
  }

  /**
   * Create Python script for GPU availability check
   */
  private async createGPUCheckScript(): Promise<string> {
    const scriptPath = path.join(this.tempDir, `gpu_check_${Date.now()}.py`);
    
    const pythonScript = `#!/usr/bin/env python3
import json
import sys

try:
    import torch
    import torch.cuda
    
    if not torch.cuda.is_available():
        print(json.dumps({"available": False, "error": "CUDA not available"}))
        sys.exit(0)
    
    gpu_props = torch.cuda.get_device_properties(0)
    gpu_name = gpu_props.name
    gpu_memory = gpu_props.total_memory / (1024**3)  # GB
    cuda_version = torch.version.cuda
    
    result = {
        "available": True,
        "gpuName": gpu_name,
        "gpuMemory": round(gpu_memory, 1),
        "cudaVersion": cuda_version
    }
    
    print(json.dumps(result))
    
except ImportError as e:
    print(json.dumps({"available": False, "error": f"Missing dependencies: {str(e)}"}))
except Exception as e:
    print(json.dumps({"available": False, "error": str(e)}))
`;

    await fs.promises.writeFile(scriptPath, pythonScript, { mode: 0o755 });
    return scriptPath;
  }

  /**
   * Create Python script for GPU transcription
   */
  private async createGPUTranscriptionScript(
    audioPath: string, 
    config: GPUTranscriptionConfig & { 
      modelSize: string; 
      language: string; 
      device: string; 
      computeType: string;
      batchSize: number;
    }
  ): Promise<string> {
    const scriptPath = path.join(this.tempDir, `gpu_transcription_${Date.now()}.py`);
    
    const pythonScript = `#!/usr/bin/env python3
import sys
import os
import torch
from faster_whisper import WhisperModel

def main():
    if len(sys.argv) < 2:
        print("Usage: python script.py <output_path>", file=sys.stderr)
        sys.exit(1)
    
    output_path = sys.argv[1]
    audio_file = "${audioPath.replace(/\\/g, '\\\\')}"
    
    try:
        print(f"Processing audio file: {audio_file}", file=sys.stderr)
        print("Using GPU-accelerated transcription mode", file=sys.stderr)
        
        # Verify CUDA availability
        if not torch.cuda.is_available():
            raise Exception("CUDA not available for GPU transcription")
        
        device = "${config.device}"
        compute_type = "${config.computeType}"
        model_size = "${config.modelSize}"
        batch_size = ${config.batchSize}
        
        print(f"GPU device: {device}", file=sys.stderr)
        print(f"Model: {model_size}, Compute type: {compute_type}", file=sys.stderr)
        print(f"Batch size: {batch_size}", file=sys.stderr)
        
        # Check GPU memory
        gpu_props = torch.cuda.get_device_properties(0)
        gpu_memory_gb = gpu_props.total_memory / (1024**3)
        print(f"GPU: {gpu_props.name} ({gpu_memory_gb:.1f}GB)", file=sys.stderr)
        
        # Initialize faster-whisper model for GPU
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root=None,
            local_files_only=False
        )
        
        print("Starting GPU transcription...", file=sys.stderr)
        
        # Transcribe with GPU optimizations (simplified)
        segments, info = model.transcribe(
            audio_file,
            language="${config.language}",
            beam_size=5,  # Higher quality for GPU
            temperature=0.0,
            condition_on_previous_text=True,
            word_timestamps=False
        )
        
        # Collect results
        transcript_text = ""
        for segment in segments:
            transcript_text += segment.text + " "
        
        # Write output
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(transcript_text.strip())
        
        print("GPU transcription completed successfully", file=sys.stderr)
        print(f"Language detected: {info.language} (confidence: {info.language_probability:.2%})", file=sys.stderr)
        print(f"Duration: {info.duration:.1f}s", file=sys.stderr)
        
    except Exception as e:
        print(f"GPU transcription error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
`;

    await fs.promises.writeFile(scriptPath, pythonScript, { mode: 0o755 });
    return scriptPath;
  }
}
