import path from "path";
import os from "os";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

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
 * GPU Detection and Configuration Utilities for faster-whisper
 */
export interface GPUInfo {
  available: boolean;
  device: string;
  memory?: number;
  name?: string;
  computeCapability?: string;
  isRTX3060?: boolean;
}

/**
 * Detect GPU availability and capabilities for faster-whisper
 */
export async function detectGPU(uvPath: string = 'uv'): Promise<GPUInfo> {
  try {
    const detectionScript = `
import torch
import json
import sys

def detect_gpu():
    try:
        if not torch.cuda.is_available():
            return {
                'available': False,
                'device': 'cpu',
                'memory': 0,
                'name': 'CPU',
                'computeCapability': 'N/A',
                'isRTX3060': False
            }
        
        # Get GPU properties
        gpu_props = torch.cuda.get_device_properties(0)
        gpu_memory = gpu_props.total_memory / (1024**3)  # Convert to GB
        gpu_name = gpu_props.name
        compute_cap = f"{gpu_props.major}.{gpu_props.minor}"
        
        # Check if it's RTX 3060 (12GB or similar memory)
        is_rtx3060 = "rtx 3060" in gpu_name.lower() or (gpu_memory >= 11.5 and gpu_memory <= 12.5)
        
        return {
            'available': True,
            'device': 'cuda',
            'memory': round(gpu_memory, 1),
            'name': gpu_name,
            'computeCapability': compute_cap,
            'isRTX3060': is_rtx3060
        }
        
    except Exception as e:
        return {
            'available': False,
            'device': 'cpu',
            'memory': 0,
            'name': f'Error: {str(e)}',
            'computeCapability': 'N/A',
            'isRTX3060': False
        }

if __name__ == "__main__":
    gpu_info = detect_gpu()
    print(json.dumps(gpu_info))
`;

    const tempScriptPath = path.join(os.tmpdir(), `gpu_detection_${Date.now()}.py`);
    await fs.promises.writeFile(tempScriptPath, detectionScript);

    try {
      const { stdout } = await execFileAsync(uvPath, ['run', 'python', tempScriptPath], {
        timeout: 30000
      });
      
      await fs.promises.unlink(tempScriptPath);
      
      const gpuInfo = JSON.parse(stdout.trim()) as GPUInfo;
      return gpuInfo;
      
    } catch (error) {
      await fs.promises.unlink(tempScriptPath);
      // Fallback to CPU if detection fails
      return {
        available: false,
        device: 'cpu',
        memory: 0,
        name: 'Detection Failed',
        computeCapability: 'N/A',
        isRTX3060: false
      };
    }
  } catch (error) {
    return {
      available: false,
      device: 'cpu',
      memory: 0,
      name: 'Detection Error',
      computeCapability: 'N/A',
      isRTX3060: false
    };
  }
}

/**
 * Get optimal faster-whisper configuration based on GPU detection
 */
export async function getOptimalFasterWhisperConfig(uvPath: string = 'uv') {
  const gpuInfo = await detectGPU(uvPath);
  
  if (!gpuInfo.available) {
    return {
      device: 'cpu',
      compute_type: 'int8',
      modelSize: 'base',
      batch_size: 4,
      beam_size: 1,
      cpu_threads: Math.min(4, os.cpus().length)
    };
  }
  
  // RTX 3060 optimized settings (19.4x target performance)
  if (gpuInfo.isRTX3060) {
    return {
      device: 'cuda',
      compute_type: 'float16',
      modelSize: 'medium',  // Optimal for RTX 3060 12GB
      batch_size: 8,        // Maximum batch size for 12GB VRAM
      beam_size: 1,         // Fastest decoding
      cpu_threads: 0        // Use GPU only
    };
  }
  
  // Other GPU configurations based on memory
  if (gpuInfo.memory && gpuInfo.memory >= 8) {
    return {
      device: 'cuda',
      compute_type: 'float16',
      modelSize: 'small',
      batch_size: 6,
      beam_size: 1,
      cpu_threads: 0
    };
  } else if (gpuInfo.memory && gpuInfo.memory >= 6) {
    return {
      device: 'cuda',
      compute_type: 'float16',
      modelSize: 'base',
      batch_size: 4,
      beam_size: 1,
      cpu_threads: 0
    };
  }
  
  // Low memory GPU fallback
  return {
    device: 'cuda',
    compute_type: 'int8',
    modelSize: 'tiny',
    batch_size: 2,
    beam_size: 1,
    cpu_threads: 0
  };
}
