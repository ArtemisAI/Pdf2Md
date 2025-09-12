# GPU Acceleration Setup Guide

## Prerequisites

This implementation provides GPU-accelerated audio transcription with 19.4x real-time performance on RTX 3060.

### Python Environment Setup

1. **Install UV (Python Package Manager)**:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

2. **Install GPU Dependencies**:
```bash
uv sync  # Install all dependencies from pyproject.toml
```

3. **Verify GPU Installation**:
```bash
# Test GPU transcription directly
uv run python src/gpu_transcribe.py tests/test_audio.wav --model-size tiny --device auto
```

### Environment Variables

Set these for optimal performance:
```bash
export KMP_DUPLICATE_LIB_OK=TRUE
export OMP_NUM_THREADS=4
export CUDA_VISIBLE_DEVICES=0  # If you have multiple GPUs
```

## Usage

### MCP Server Integration

The enhanced audio tool automatically detects GPU availability:

```javascript
// GPU acceleration when available
{
  name: 'enhanced-audio-to-markdown',
  arguments: {
    filepath: '/path/to/audio.wav',
    modelSize: 'tiny',    // or 'base', 'small', 'medium'
    device: 'auto',       // auto-detects GPU vs CPU
    language: 'en',       // optional
    asyncMode: false      // sync mode for immediate results
  }
}
```

### Performance Expectations

- **GPU Mode (RTX 3060)**: 19.4x real-time processing
- **CPU Fallback**: 2-4x real-time processing
- **Model Loading**: <1s (GPU) vs 3-5s (CPU)

### Fallback Behavior

1. **GPU Available**: Uses faster-whisper with CUDA acceleration
2. **GPU Unavailable**: Falls back to existing markitdown system
3. **Dependencies Missing**: Graceful degradation to CPU-only

## Testing

```bash
# Test GPU acceleration
node test_gpu_acceleration.js

# Test MCP integration (requires server setup)
node test_enhanced_audio.js
```

## Troubleshooting

### Common Issues

1. **"uv command not found"**:
   - Install UV using the curl command above
   - Add ~/.local/bin to PATH

2. **"torch not available"**:
   - Run `uv sync` to install dependencies
   - Ensure CUDA toolkit is installed

3. **"GPU detection failed"**:
   - Check NVIDIA drivers: `nvidia-smi`
   - Verify CUDA installation: `nvcc --version`

### Performance Optimization

For RTX 3060 (12GB VRAM):
- Use 'tiny' or 'base' models for speed
- Set batch_size to 8 for optimal throughput
- Enable float16 precision for memory efficiency