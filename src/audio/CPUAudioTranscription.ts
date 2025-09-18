/**
 * CPU-Only Audio Transcription
 * Dedicated CPU-based audio transcription using faster-whisper with CPU optimizations
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = promisify(execFile);

export interface CPUTranscriptionConfig {
  modelSize?: 'tiny' | 'base' | 'small' | 'medium';
  language?: string;
  computeType?: 'int8' | 'int16' | 'float32';
}

export class CPUAudioTranscription {
  private tempDir: string;

  constructor() {
    this.tempDir = os.tmpdir();
  }

  /**
   * Transcribe audio file using CPU-only faster-whisper
   */
  async transcribe(
    filePath: string,
    options: CPUTranscriptionConfig = {}
  ): Promise<{ 
    text: string; 
    processingTime: number; 
    modelUsed: string;
    device: string;
  }> {
    const startTime = Date.now();
    
    // Validate input file
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    const config = {
      modelSize: options.modelSize || 'base',
      language: options.language || 'en', 
      computeType: options.computeType || 'int8'
    };

    console.error(`[CPU_TRANSCRIBE] Using CPU transcription with model: ${config.modelSize}`);

    // Create Python transcription script
    const scriptPath = await this.createCPUTranscriptionScript(filePath, config);
    const outputPath = path.join(this.tempDir, `cpu_transcript_${Date.now()}.txt`);

    try {
      // Execute CPU transcription using direct venv
      const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python');
      const { stdout, stderr } = await execFileAsync(venvPython, [scriptPath, outputPath], {
        env: process.env,
        timeout: 300000 // 5 minute timeout
      });

      if (stderr) {
        console.error(`[CPU_TRANSCRIBE] Python stderr: ${stderr}`);
      }

      // Read transcription result
      if (!fs.existsSync(outputPath)) {
        throw new Error('CPU transcription failed to generate output file');
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
        device: 'cpu'
      };

    } catch (error) {
      // Cleanup on error
      await Promise.all([
        fs.promises.unlink(scriptPath).catch(() => {}),
        fs.promises.unlink(outputPath).catch(() => {})
      ]);
      
      throw new Error(`CPU transcription failed: ${error}`);
    }
  }

  /**
   * Create Python script for CPU-only transcription
   */
  private async createCPUTranscriptionScript(
    audioPath: string, 
    config: CPUTranscriptionConfig & { modelSize: string; language: string; computeType: string }
  ): Promise<string> {
    const scriptPath = path.join(this.tempDir, `cpu_transcription_${Date.now()}.py`);
    
    const pythonScript = `#!/usr/bin/env python3
import sys
import os
from faster_whisper import WhisperModel
import torch

def main():
    if len(sys.argv) < 2:
        print("Usage: python script.py <output_path>", file=sys.stderr)
        sys.exit(1)
    
    output_path = sys.argv[1]
    audio_file = "${audioPath.replace(/\\/g, '\\\\')}"
    
    try:
        print(f"Processing audio file: {audio_file}", file=sys.stderr)
        print("Using CPU-only transcription mode", file=sys.stderr)
        
        # Force CPU configuration
        device = "cpu"
        compute_type = "${config.computeType}"
        model_size = "${config.modelSize}"
        
        print(f"Loading faster-whisper model: {model_size} on {device}", file=sys.stderr)
        print(f"Compute type: {compute_type}", file=sys.stderr)
        
        # Initialize faster-whisper model for CPU
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            cpu_threads=4,  # Optimize for CPU
            num_workers=1   # Single worker for stability
        )
        
        print("Starting CPU transcription...", file=sys.stderr)
        
        # Transcribe
        segments, info = model.transcribe(
            audio_file,
            language="${config.language}",
            beam_size=1,  # Faster for CPU
            temperature=0.0,
            condition_on_previous_text=False
        )
        
        # Collect results
        transcript_text = ""
        for segment in segments:
            transcript_text += segment.text + " "
        
        # Write output
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(transcript_text.strip())
        
        print("CPU transcription completed successfully", file=sys.stderr)
        print(f"Language detected: {info.language} (confidence: {info.language_probability:.2%})", file=sys.stderr)
        
    except Exception as e:
        print(f"CPU transcription error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
`;

    await fs.promises.writeFile(scriptPath, pythonScript, { mode: 0o755 });
    return scriptPath;
  }
}
