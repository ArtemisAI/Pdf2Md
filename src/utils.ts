import path from "path";
import os from "os";
import fs from "fs";

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
 * Detect if GPU acceleration is available and optimal
 * Checks environment variables set during GitHub Copilot setup
 */
export function detectGPUCapability(): {
  gpuAvailable: boolean;
  cudaAvailable: boolean;
  rtx3060Detected: boolean;
  recommendDevice: string;
} {
  const cudaVisible = process.env.CUDA_VISIBLE_DEVICES !== undefined && process.env.CUDA_VISIBLE_DEVICES !== '';
  const torchCuda = process.env.TORCH_CUDA_AVAILABLE === 'true';
  const nvidiaSmi = process.env.NVIDIA_SMI_AVAILABLE === 'true';
  const gpuName = process.env.GPU_NAME?.toLowerCase() || '';
  const gpuMemory = process.env.GPU_MEMORY_GB ? parseInt(process.env.GPU_MEMORY_GB) : 0;

  const rtx3060Detected = gpuName.includes('rtx 3060') || gpuMemory >= 12;
  const gpuAvailable = cudaVisible && torchCuda && nvidiaSmi;

  let recommendDevice = 'cpu';
  if (gpuAvailable) {
    if (rtx3060Detected) {
      recommendDevice = 'cuda:0'; // RTX 3060 optimized
    } else if (gpuMemory >= 8) {
      recommendDevice = 'cuda:0'; // High-end GPU
    } else if (gpuMemory >= 6) {
      recommendDevice = 'cuda:0'; // Mid-range GPU
    }
  }

  return {
    gpuAvailable,
    cudaAvailable: torchCuda,
    rtx3060Detected,
    recommendDevice,
  };
}
