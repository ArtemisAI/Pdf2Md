/**
 * Audio File Processor
 * Handles format validation, conversion, and audio file operations for RTX 3060 optimized processing
 */

import { AudioProcessor } from '../types/audio.js';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';

const execFileAsync = promisify(execFile);

export class AudioFileProcessor implements AudioProcessor {
  private supportedFormats = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.mp4', '.webm', '.mkv'];
  private preferredFormats = ['.wav', '.mp3', '.flac'];
  
  /**
   * Validate if audio format is supported
   */
  async validateFormat(filePath: string): Promise<boolean> {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedFormats.includes(ext);
  }
  
  /**
   * Get audio file duration in seconds
   */
  async getDuration(filePath: string): Promise<number> {
    try {
      // Use ffprobe to get audio duration
      const durationScript = await this.createDurationScript(filePath);
      
      try {
        const { stdout } = await execFileAsync('uv', ['run', 'python', durationScript]);
        await fs.promises.unlink(durationScript);
        
        const duration = parseFloat(stdout.trim());
        return isNaN(duration) ? 0 : duration;
      } catch {
        await fs.promises.unlink(durationScript);
        return 0;
      }
    } catch {
      return 0;
    }
  }
  
  /**
   * Convert audio file to supported format if needed
   */
  async convertIfNeeded(filePath: string): Promise<string> {
    if (await this.validateFormat(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      
      // Check if it's already in a preferred format
      if (this.preferredFormats.includes(ext)) {
        return filePath;
      }
      
      // Convert to WAV for better compatibility
      return await this.convertToWav(filePath);
    }
    
    throw new Error(`Unsupported audio format: ${path.extname(filePath)}`);
  }
  
  /**
   * Convert audio file to WAV format using ffmpeg
   */
  private async convertToWav(inputPath: string): Promise<string> {
    const outputPath = path.join(
      os.tmpdir(),
      `rtx3060_converted_${Date.now()}.wav`
    );
    
    const conversionScript = await this.createConversionScript(inputPath, outputPath);
    
    try {
      await execFileAsync('uv', ['run', 'python', conversionScript]);
      await fs.promises.unlink(conversionScript);
      
      // Verify the output file was created
      if (await this.fileExists(outputPath)) {
        return outputPath;
      } else {
        throw new Error('Conversion failed: output file not created');
      }
    } catch (error) {
      await fs.promises.unlink(conversionScript);
      throw new Error(`Audio conversion failed: ${error}`);
    }
  }
  
  /**
   * Get audio file metadata
   */
  async getMetadata(filePath: string): Promise<AudioMetadata> {
    try {
      const metadataScript = await this.createMetadataScript(filePath);
      
      try {
        const { stdout } = await execFileAsync('uv', ['run', 'python', metadataScript]);
        await fs.promises.unlink(metadataScript);
        
        const metadata = JSON.parse(stdout.trim());
        return metadata;
      } catch {
        await fs.promises.unlink(metadataScript);
        return this.getDefaultMetadata(filePath);
      }
    } catch {
      return this.getDefaultMetadata(filePath);
    }
  }
  
  /**
   * Check if audio file is too large for processing
   */
  async checkFileSize(filePath: string, maxSizeMB: number = 500): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(filePath);
      const sizeMB = stats.size / (1024 * 1024);
      return sizeMB <= maxSizeMB;
    } catch {
      return false;
    }
  }
  
  /**
   * Split large audio file into smaller chunks optimized for RTX 3060
   */
  async splitAudioFile(filePath: string, chunkDurationSeconds: number = 300): Promise<string[]> {
    const duration = await this.getDuration(filePath);
    
    if (duration <= chunkDurationSeconds) {
      return [filePath]; // No need to split
    }
    
    const numberOfChunks = Math.ceil(duration / chunkDurationSeconds);
    const chunks: string[] = [];
    
    for (let i = 0; i < numberOfChunks; i++) {
      const startTime = i * chunkDurationSeconds;
      const outputPath = path.join(
        os.tmpdir(),
        `rtx3060_chunk_${i}_${Date.now()}.wav`
      );
      
      const chunkScript = await this.createChunkScript(filePath, outputPath, startTime, chunkDurationSeconds);
      
      try {
        await execFileAsync('uv', ['run', 'python', chunkScript]);
        await fs.promises.unlink(chunkScript);
        
        if (await this.fileExists(outputPath)) {
          chunks.push(outputPath);
        }
      } catch (error) {
        await fs.promises.unlink(chunkScript);
        console.warn(`Failed to create chunk ${i}:`, error);
      }
    }
    
    return chunks;
  }
  
  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (filePath.includes(os.tmpdir()) && (filePath.includes('rtx3060') || filePath.includes('converted'))) {
          await fs.promises.unlink(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  
  /**
   * Create Python script for getting audio duration
   */
  private async createDurationScript(filePath: string): Promise<string> {
    const scriptContent = `
import sys
import subprocess
import json

def get_audio_duration(file_path):
    try:
        # Use ffprobe to get duration
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json', 
            '-show_format', file_path
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return 0
            
        data = json.loads(result.stdout)
        duration = float(data['format']['duration'])
        return duration
    except:
        return 0

if __name__ == "__main__":
    duration = get_audio_duration("${filePath.replace(/\\/g, '\\\\')}")
    print(duration)
`;
    
    const tempScriptPath = path.join(os.tmpdir(), `rtx3060_duration_${Date.now()}.py`);
    await fs.promises.writeFile(tempScriptPath, scriptContent);
    return tempScriptPath;
  }
  
  /**
   * Create Python script for audio conversion
   */
  private async createConversionScript(inputPath: string, outputPath: string): Promise<string> {
    const scriptContent = `
import sys
import subprocess

def convert_audio(input_path, output_path):
    try:
        # Use ffmpeg to convert to WAV optimized for RTX 3060 processing
        result = subprocess.run([
            'ffmpeg', '-i', input_path, '-acodec', 'pcm_s16le', 
            '-ar', '16000', '-ac', '1', '-y', output_path
        ], capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise Exception(f"ffmpeg error: {result.stderr}")
            
        return True
    except Exception as e:
        print(f"Conversion error: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = convert_audio("${inputPath.replace(/\\/g, '\\\\')}", "${outputPath.replace(/\\/g, '\\\\')}")
    if not success:
        sys.exit(1)
`;
    
    const tempScriptPath = path.join(os.tmpdir(), `rtx3060_convert_${Date.now()}.py`);
    await fs.promises.writeFile(tempScriptPath, scriptContent);
    return tempScriptPath;
  }
  
  /**
   * Create Python script for getting audio metadata
   */
  private async createMetadataScript(filePath: string): Promise<string> {
    const scriptContent = `
import sys
import subprocess
import json

def get_audio_metadata(file_path):
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-print_format', 'json', 
            '-show_format', '-show_streams', file_path
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            return {}
            
        data = json.loads(result.stdout)
        
        metadata = {
            'duration': float(data.get('format', {}).get('duration', 0)),
            'size': int(data.get('format', {}).get('size', 0)),
            'bitrate': int(data.get('format', {}).get('bit_rate', 0)),
            'format_name': data.get('format', {}).get('format_name', 'unknown'),
            'streams': []
        }
        
        for stream in data.get('streams', []):
            if stream.get('codec_type') == 'audio':
                metadata['streams'].append({
                    'codec_name': stream.get('codec_name', 'unknown'),
                    'sample_rate': int(stream.get('sample_rate', 0)),
                    'channels': int(stream.get('channels', 0)),
                    'duration': float(stream.get('duration', 0))
                })
        
        return metadata
    except:
        return {}

if __name__ == "__main__":
    metadata = get_audio_metadata("${filePath.replace(/\\/g, '\\\\')}")
    print(json.dumps(metadata))
`;
    
    const tempScriptPath = path.join(os.tmpdir(), `rtx3060_metadata_${Date.now()}.py`);
    await fs.promises.writeFile(tempScriptPath, scriptContent);
    return tempScriptPath;
  }
  
  /**
   * Create Python script for chunking audio
   */
  private async createChunkScript(inputPath: string, outputPath: string, startTime: number, duration: number): Promise<string> {
    const scriptContent = `
import sys
import subprocess

def create_audio_chunk(input_path, output_path, start_time, duration):
    try:
        result = subprocess.run([
            'ffmpeg', '-i', input_path, '-ss', str(start_time), 
            '-t', str(duration), '-acodec', 'pcm_s16le', 
            '-ar', '16000', '-ac', '1', '-y', output_path
        ], capture_output=True, text=True, timeout=120)
        
        if result.returncode != 0:
            raise Exception(f"ffmpeg error: {result.stderr}")
            
        return True
    except Exception as e:
        print(f"Chunk creation error: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = create_audio_chunk(
        "${inputPath.replace(/\\/g, '\\\\')}", 
        "${outputPath.replace(/\\/g, '\\\\')}", 
        ${startTime}, 
        ${duration}
    )
    if not success:
        sys.exit(1)
`;
    
    const tempScriptPath = path.join(os.tmpdir(), `rtx3060_chunk_${Date.now()}.py`);
    await fs.promises.writeFile(tempScriptPath, scriptContent);
    return tempScriptPath;
  }
  
  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get default metadata when ffprobe fails
   */
  private getDefaultMetadata(filePath: string): AudioMetadata {
    return {
      duration: 0,
      size: 0,
      bitrate: 0,
      format_name: path.extname(filePath).substring(1),
      streams: []
    };
  }
}

/**
 * Audio metadata interface
 */
export interface AudioMetadata {
  duration: number;
  size: number;
  bitrate: number;
  format_name: string;
  streams: {
    codec_name: string;
    sample_rate: number;
    channels: number;
    duration: number;
  }[];
}
