# GitHub Copilot Configuration for Pdf2Md MCP Server

## Repository Context

This is a Model Context Protocol (MCP) server for converting files to Markdown, with a focus on **GPU-accelerated audio transcription**.

### Project Overview
- **Primary Language**: TypeScript/Node.js for MCP server
- **Audio Processing**: Python with faster-whisper and CUDA support  
- **Target Performance**: 19.4x real-time audio transcription with GPU acceleration
- **Deployment**: Cross-platform (Windows/Linux) with GPU/CPU fallback

## Current Development Context

### Active Branch: AUDIO
**Objective**: Integrate proven GPU acceleration (19.4x performance) into MCP server's audio tools

### Key Files to Focus On:
1. **`src/tools.ts`** - Main MCP tools, audio transcription needs GPU integration
2. **`src/utils.ts`** - Utility functions, needs GPU detection capabilities  
3. **`src/index.ts`** - MCP server entry point
4. **`requirements-gpu.txt`** - Python dependencies for GPU acceleration

### Performance Benchmarks Achieved Locally:
- **Overall Speed**: 19.4x real-time processing (RTX 3060)
- **Peak Performance**: 29.8x real-time on optimal files
- **Model Loading**: 0.70s initialization
- **Memory Efficiency**: <2GB VRAM usage

## Implementation Requirements

### Primary Task: Replace `whisper` with `faster-whisper` in `src/tools.ts`

**Current Issue**: MCP server uses old whisper library
**Solution**: Update to faster-whisper with GPU acceleration

```typescript
// Target implementation pattern:
interface AudioTranscriptionTool {
  useGPU: boolean;           // Auto-detect or configured
  modelSize: 'tiny' | 'base'; // Start with 'tiny' for speed  
  device: 'cuda' | 'cpu' | 'auto';
  fallbackStrategy: 'graceful'; // Always maintain functionality
}
```

### Technical Dependencies:
```
faster-whisper>=1.0.0
torch>=2.4.0+cu121
nvidia-cublas-cu12
nvidia-cudnn-cu12==9.*
```

### Environment Variables Required:
```bash
KMP_DUPLICATE_LIB_OK=TRUE  # Critical: Resolves OpenMP conflicts
OMP_NUM_THREADS=4          # Optimal threading
```

### Fallback Strategy Pattern:
```typescript
async function transcribeAudio(filePath: string) {
  try {
    if (await detectGPU()) {
      return await transcribeGPU(filePath);
    }
  } catch (error) {
    console.warn('GPU transcription failed, using CPU fallback:', error);
  }
  return await transcribeCPU(filePath);
}
```

## Testing Framework Available

### Test Files Ready:
- **`tests/gpu_acceleration/`** - Complete GPU testing suite
- **`tests/audio_samples/github_friendly/`** - 5 small MP3s for CI
- **`tests/cv_sample/`** - 15 Common Voice samples for comprehensive testing

### Performance Targets:
- **GPU Mode**: >15x real-time processing (target: maintain 19.4x)
- **CPU Fallback**: >2x real-time processing
- **Model Loading**: <2s initialization
- **Memory Usage**: <2GB VRAM

### Validation Commands:
```bash
# Test GPU acceleration
python tests/gpu_acceleration/test_gpu_final.py

# Test MCP integration  
node tests/test_enhanced_audio.js

# Performance benchmark
python tests/gpu_acceleration/benchmark_gpu_vs_cpu.py
```

## Code Quality Guidelines

### TypeScript Best Practices:
- Use strict typing for all new audio transcription interfaces
- Implement proper error handling with typed exceptions
- Add comprehensive JSDoc comments for GPU-related functions
- Follow existing MCP server architecture patterns

### Python Integration:
- Use subprocess management for Python audio processing
- Implement proper resource cleanup (GPU memory)
- Add logging for GPU detection and fallback scenarios
- Handle cross-platform path differences

### Performance Considerations:
- Implement lazy loading for GPU models
- Cache model instances when appropriate
- Monitor memory usage and implement cleanup
- Add processing time metrics for benchmarking

## Integration Success Criteria

### Must Achieve:
- [x] **GPU acceleration >15x real-time** (target: maintain 19.4x)
- [ ] **MCP API compatibility** - no breaking changes
- [ ] **Robust CPU fallback** for universal compatibility
- [ ] **Cross-platform support** (Windows/Linux)
- [ ] **Production-ready error handling**

### Quality Metrics:
- [ ] **CI/CD pipeline passes** on both GPU and CPU
- [ ] **Memory efficiency** <2GB VRAM usage
- [ ] **Model loading** <2s initialization
- [ ] **Language detection** >70% confidence
- [ ] **Processing reliability** <5% error rate

## Context for Copilot

### Development Philosophy:
You are working on a high-performance MCP server that needs to process audio files at exceptional speeds while maintaining reliability. The GPU acceleration technology is proven locally but needs integration into the production MCP server.

### Key Constraints:
- **Backward Compatibility**: Existing MCP clients must continue working
- **Resource Management**: Graceful handling of limited GPU resources
- **Cross-Platform**: Must work on Windows and Linux environments
- **Production Ready**: Robust error handling and logging

### Expected Outcome:
A production-ready MCP server that can process audio 19x faster than real-time when GPU is available, with seamless fallback to CPU processing when needed.

## Documentation Requirements

### Update After Implementation:
- **README.md** - Add GPU acceleration features and requirements
- **API Documentation** - Document new audio processing capabilities  
- **Installation Guide** - Include GPU setup instructions
- **Performance Benchmarks** - Document achieved speeds

---

**Note**: All technical groundwork is complete. Focus on integrating the proven GPU acceleration technology into the MCP server while maintaining reliability and compatibility.
