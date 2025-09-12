# Enhanced Audio Transcription Testing Protocol

## Overview
This document outlines the testing procedures for GPU-accelerated audio transcription using faster-whisper.

## Test Environment Setup

### Hardware Requirements
- **GPU**: NVIDIA RTX 3060 or equivalent (12GB+ VRAM recommended)
- **CUDA**: 12.1 or compatible
- **RAM**: 16GB+ recommended

### Software Dependencies
```bash
# Core dependencies
pip install faster-whisper torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install nvidia-cublas-cu12 nvidia-cudnn-cu12==9.*

# Testing dependencies
pip install psutil pytest
```

### Environment Variables
```bash
export KMP_DUPLICATE_LIB_OK=TRUE
export OMP_NUM_THREADS=4
export CUDA_VISIBLE_DEVICES=0
```

## Test Files

### GitHub-Compatible Test Dataset
Located in `tests/audio_samples/github_friendly/`:
- `test_002_duration_21kb.mp3` (21.2 KB, 3.6s)
- `test_003_duration_28kb.mp3` (28.3 KB, 4.8s)
- `test_001_duration_29kb.mp3` (29.2 KB, 5.0s)
- `test_004_duration_31kb.mp3` (30.8 KB, 5.3s)
- `test_005_duration_32kb.mp3` (31.9 KB, 5.4s)

### Full Test Dataset (Local Only)
Extended set with files up to 71KB for comprehensive performance testing.

## Test Scenarios

### 1. GPU Functionality Test
```bash
python tests/gpu_acceleration/test_gpu_final.py
```
**Expected Results**:
- ✅ CUDA environment detection
- ✅ Model loading on GPU (<1s)
- ✅ Audio transcription (>5x real-time)
- ✅ Memory cleanup

### 2. Performance Benchmark
```bash
python tests/gpu_acceleration/test_large_files_gpu.py
```
**Expected Results**:
- Overall speed: >15x real-time
- Peak performance: >25x real-time
- Efficiency: >90% time saved

### 3. CPU Fallback Test
```bash
CUDA_VISIBLE_DEVICES="" python tests/gpu_acceleration/benchmark_gpu_vs_cpu.py
```
**Expected Results**:
- Graceful fallback to CPU
- Continued functionality
- Performance degradation to ~2-5x real-time

### 4. Integration Test
```bash
# Test MCP server integration
node test_mcp_client.js
```

## Performance Benchmarks

### Target Metrics
- **GPU Speed**: >15x real-time (target: 19x)
- **Model Loading**: <2s (target: 0.7s)
- **Memory Usage**: <2GB GPU VRAM
- **CPU Fallback**: >2x real-time

### Quality Metrics
- **Language Detection**: >70% high confidence
- **Transcription Accuracy**: Manual verification on sample files
- **Error Rate**: <5% processing failures

## Automated Testing

### Test Commands
```bash
# Quick GPU test
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"

# Full test suite
pytest tests/gpu_acceleration/ -v

# Performance validation
python tests/gpu_acceleration/test_large_files_gpu.py | grep "EXCEPTIONAL\|EXCELLENT"
```

### CI/CD Integration
```yaml
# .github/workflows/gpu-test.yml
name: GPU Acceleration Test
on: [push, pull_request]
jobs:
  gpu-test:
    runs-on: gpu-linux-4-cores-16gb
    steps:
      - uses: actions/checkout@v3
      - name: Setup CUDA
        uses: Jimver/cuda-toolkit@v0.2.11
      - name: Install dependencies
        run: pip install -r requirements-gpu.txt
      - name: Test GPU functionality
        run: python tests/gpu_acceleration/test_gpu_final.py
```

## Troubleshooting

### Common Issues
1. **OpenMP Conflict**: Set `KMP_DUPLICATE_LIB_OK=TRUE`
2. **CUDA Not Found**: Install nvidia-toolkit
3. **cuDNN Version**: Ensure cuDNN 9.x for CUDA 12
4. **Memory Issues**: Reduce batch size or model size

### Debug Commands
```bash
# Check CUDA installation
python -c "import torch; print(torch.version.cuda)"

# Test GPU access
python -c "import torch; print(torch.cuda.get_device_name(0))"

# Check NVIDIA libraries
python -c "import nvidia.cublas.lib; print('cuBLAS OK')"
```

## Test Report Template

### Performance Test Results
```
🚀 GPU ACCELERATION TEST RESULTS
==========================================
Environment: [GPU Model] / CUDA [Version]
Date: [Test Date]

Performance Metrics:
- Overall Speed: [X.X]x real-time
- Peak Speed: [X.X]x real-time
- Model Load Time: [X.X]s
- Memory Usage: [X.X] GB

Quality Metrics:
- Language Detection: [XX]% high confidence
- Processing Success Rate: [XX]%

Test Status: ✅ PASS / ❌ FAIL
Notes: [Any observations]
```

## Validation Checklist

### Pre-Integration
- [ ] GPU detection working
- [ ] Model loading successful
- [ ] Audio processing functional
- [ ] Performance targets met
- [ ] CPU fallback working
- [ ] Memory management efficient

### Post-Integration
- [ ] MCP tools updated
- [ ] API compatibility maintained
- [ ] Documentation updated
- [ ] CI/CD pipeline working
- [ ] Error handling robust
- [ ] Performance monitoring active

---
*Testing Protocol v1.0*
*Last Updated: September 12, 2025*
