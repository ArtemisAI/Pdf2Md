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
  name?: string;
  memory?: number;
  compute_type: string;
  recommended_model: string;
}

/**
 * Detect GPU availability and optimal configuration for faster-whisper
 */
export async function detectGPUCapabilities(): Promise<GPUInfo> {
  try {
    // Create a Python script to detect GPU capabilities
    const detectionScript = `
import sys
import json

def detect_gpu():
    try:
        import torch
        
        if not torch.cuda.is_available():
            return {
                'available': False,
                'device': 'cpu',
                'compute_type': 'int8',
                'recommended_model': 'base'
            }
        
        gpu_props = torch.cuda.get_device_properties(0)
        gpu_memory = gpu_props.total_memory / (1024**3)
        gpu_name = gpu_props.name.lower()
        
        # Determine optimal configuration based on GPU
        if "rtx 3060" in gpu_name or gpu_memory >= 12:
            return {
                'available': True,
                'device': 'cuda',
                'name': gpu_props.name,
                'memory': gpu_memory,
                'compute_type': 'float16',
                'recommended_model': 'medium'
            }
        elif gpu_memory >= 8:
            return {
                'available': True,
                'device': 'cuda',
                'name': gpu_props.name,
                'memory': gpu_memory,
                'compute_type': 'float16',
                'recommended_model': 'small'
            }
        elif gpu_memory >= 6:
            return {
                'available': True,
                'device': 'cuda',
                'name': gpu_props.name,
                'memory': gpu_memory,
                'compute_type': 'float16',
                'recommended_model': 'base'
            }
        else:
            return {
                'available': False,
                'device': 'cpu',
                'compute_type': 'int8',
                'recommended_model': 'base'
            }
            
    except ImportError:
        return {
            'available': False,
            'device': 'cpu',
            'compute_type': 'int8',
            'recommended_model': 'base'
        }
    except Exception as e:
        return {
            'available': False,
            'device': 'cpu',
            'compute_type': 'int8',
            'recommended_model': 'base',
            'error': str(e)
        }

if __name__ == "__main__":
    result = detect_gpu()
    print(json.dumps(result))
`;

    const tempScriptPath = path.join(os.tmpdir(), `gpu_detection_${Date.now()}.py`);
    await fs.promises.writeFile(tempScriptPath, detectionScript);

    try {
      const { stdout } = await execFileAsync('python3', [tempScriptPath], {
        timeout: 10000 // 10 second timeout
      });
      
      await fs.promises.unlink(tempScriptPath);
      
      const result = JSON.parse(stdout.trim());
      return result;
      
    } catch (error) {
      // Clean up on error
      try {
        await fs.promises.unlink(tempScriptPath);
      } catch {}
      
      // Return CPU fallback on any error
      return {
        available: false,
        device: 'cpu',
        compute_type: 'int8',
        recommended_model: 'base'
      };
    }
  } catch (error) {
    // Return CPU fallback on any error
    return {
      available: false,
      device: 'cpu',
      compute_type: 'int8',
      recommended_model: 'base'
    };
  }
}

/**
 * Get optimal transcription configuration based on GPU detection
 */
export async function getOptimalTranscriptionConfig() {
  const gpuInfo = await detectGPUCapabilities();
  
  return {
    device: gpuInfo.device,
    compute_type: gpuInfo.compute_type,
    model_size: gpuInfo.recommended_model,
    gpu_available: gpuInfo.available,
    gpu_name: gpuInfo.name,
    gpu_memory: gpuInfo.memory
  };
}

/**
 * Environment setup checker for GPU acceleration
 */
export function checkGPUEnvironment(): { [key: string]: string | boolean } {
  return {
    cuda_visible_devices: process.env.CUDA_VISIBLE_DEVICES || 'not set',
    kmp_duplicate_lib_ok: process.env.KMP_DUPLICATE_LIB_OK === 'TRUE',
    omp_num_threads: process.env.OMP_NUM_THREADS || 'not set',
    torch_cuda_available: process.env.TORCH_CUDA_AVAILABLE === 'true',
    nvidia_smi_available: process.env.NVIDIA_SMI_AVAILABLE === 'true'
  };
}
