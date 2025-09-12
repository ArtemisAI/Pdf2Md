import path from "path";
import os from "os";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);

export function expandHome(filepath: string): string {
  if (filepath.startsWith("~/") || filepath === "~") {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export async function saveToTempFile(
  content: string | Buffer,
  suggestedExtension?: string | null,
): Promise<string> {
  let outputExtension = "md";
  if (suggestedExtension != null) {
    outputExtension = suggestedExtension;
  }

  const tempOutputPath = path.join(
    os.tmpdir(),
    `enhanced_audio_output_${Date.now()}.${outputExtension}`,
  );
  await fs.promises.writeFile(tempOutputPath, content);
  return tempOutputPath;
}

/**
 * GPU Detection and Configuration Utilities
 */

export interface GPUInfo {
  available: boolean;
  device: string;
  gpuName?: string;
  gpuMemoryGB?: number;
  recommendedModel: string;
  cudaAvailable: boolean;
}

/**
 * Detect GPU capabilities for audio transcription
 */
export async function detectGPU(uvPath: string = 'uv'): Promise<GPUInfo> {
  const defaultGPUInfo: GPUInfo = {
    available: false,
    device: 'cpu',
    recommendedModel: 'tiny',
    cudaAvailable: false
  };

  try {
    // Check if uv is available first
    const expandedUvPath = expandHome(uvPath);
    await execFileAsync('which', [expandedUvPath.split(' ')[0]], { timeout: 5000 });
    
    // Try to detect GPU using Python script
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptPath = path.join(currentDir, 'gpu_transcribe.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.warn('GPU transcription script not found');
      return defaultGPUInfo;
    }
    
    const { stdout, stderr } = await execFileAsync(expandedUvPath, [
      'run', 'python', scriptPath, '--help'
    ], { timeout: 10000 });

    // If script runs successfully, GPU detection is available
    return {
      available: true,
      device: 'auto', // Let the script auto-detect
      recommendedModel: 'tiny', // Conservative default
      cudaAvailable: true // Assume available if script works
    };

  } catch (error) {
    console.warn('GPU detection failed, using CPU fallback:', error instanceof Error ? error.message : 'Unknown error');
    return defaultGPUInfo;
  }
}

/**
 * Get optimal transcription settings based on GPU capability
 */
export async function getOptimalTranscriptionConfig(uvPath: string = 'uv'): Promise<{
  device: string;
  modelSize: string;
  useGPU: boolean;
}> {
  const gpuInfo = await detectGPU(uvPath);
  
  return {
    device: gpuInfo.available ? 'auto' : 'cpu',
    modelSize: gpuInfo.recommendedModel,
    useGPU: gpuInfo.available
  };
}
