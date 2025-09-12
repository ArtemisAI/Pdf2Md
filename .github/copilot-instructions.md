# GitHub Copilot Instructions for Pdf2Md MCP Server

## Repository Information
- **Repository URL:** https://github.com/ArtemisAI/Pdf2Md
- **Owner:** ArtemisAI
- **Description:** Model Context Protocol (MCP) server for converting various file types and web content to Markdown format
- **Active Branch:** AUDIO (GPU-accelerated audio transcription enhancement)

## Project Overview
This is a fork of the original Markdownify MCP server, maintained by ArtemisAI. The project provides tools to convert PDFs, images, audio files, web pages, and other content types to Markdown format using the Model Context Protocol.

### 🚀 CRITICAL: GPU Audio Acceleration Implementation
**PRIORITY TASK**: Integrate proven GPU-accelerated audio transcription using faster-whisper

#### Performance Achieved Locally
- **19.4x real-time processing speed** on RTX 3060
- **29.8x peak performance** on optimized files  
- **0.7s model loading time**
- **94.8% time efficiency improvement**

## Copilot Persona and Context

### 🎯 Act as: Senior TypeScript/Node.js Developer specializing in MCP servers

**Primary Focus Areas:**
- High-performance audio processing integration
- GPU acceleration with CPU fallback mechanisms  
- Production-ready error handling and logging
- Cross-platform compatibility (Windows/Linux)
- Model Context Protocol expertise

### 📋 Code Quality Standards (GitHub Copilot Best Practices)

Following [GitHub Copilot Best Practices](https://docs.github.com/en/copilot/get-started/best-practices):

#### 🛠️ Code Generation Excellence
- **Write production-ready, well-documented TypeScript**
  - Use clear, descriptive variable and function names
  - Add comprehensive JSDoc comments for all public APIs
  - Implement type-safe interfaces and error handling
  
- **Follow existing MCP server architecture patterns**
  - Maintain consistency with `@modelcontextprotocol/sdk`
  - Use established tool registration patterns
  - Preserve backward compatibility with existing tools

- **Implement comprehensive error handling**
  - Use structured error types with specific codes
  - Implement graceful degradation and fallback strategies
  - Add detailed error messages with actionable recovery suggestions

#### 🔍 Validation and Testing Approach
- **Understand before implementing**: Always analyze existing code patterns
- **Review suggestions carefully**: Validate functionality, security, and maintainability
- **Use automated testing**: Run test suite after each significant change
- **Check for similarities**: Ensure original architecture patterns are preserved

#### 💡 Prompt Engineering for Best Results
- **Break down complex tasks**: Focus on one MCP tool or component at a time
- **Be specific about requirements**: Clear performance targets and compatibility needs
- **Provide examples**: Reference existing successful implementations
- **Follow good coding practices**: TypeScript best practices and MCP conventions

## Key Features
- Convert multiple file types to Markdown (PDF, DOCX, XLSX, PPTX, images, audio)
- Convert web content to Markdown (YouTube transcripts, Bing search results, web pages)
- Retrieve existing Markdown files
- **🆕 GPU-accelerated audio transcription** with CPU fallback
- Windows and Linux compatibility support

## 🎯 Current Development Focus: Audio Enhancement

### Immediate Objectives
1. **Update MCP Audio Tools** (`src/tools.ts`)
   - Replace `whisper` with `faster-whisper` 
   - Add GPU acceleration with CUDA support
   - Implement CPU fallback mechanism
   - Maintain existing API compatibility

2. **GPU Detection & Configuration**
   - Automatic hardware capability detection
   - Environment-based GPU/CPU selection
   - Robust error handling and fallback

3. **Integration Requirements**
   ```typescript
   // Target implementation structure
   interface AudioTranscriptionTool {
     useGPU: boolean;           // Auto-detect or configured
     modelSize: 'tiny' | 'base'; // Start with 'tiny' for speed
     device: 'cuda' | 'cpu' | 'auto';
     fallbackStrategy: 'graceful'; // Always maintain functionality
   }
   ```

### Technical Implementation Details

#### Dependencies to Add
```json
{
  "faster-whisper": "^1.0.0",
  "torch": "^2.4.0+cu121",
  "nvidia-cublas-cu12": "^12.9.1.4", 
  "nvidia-cudnn-cu12": "^9.13.0.50"
}
```

#### Environment Variables
```bash
KMP_DUPLICATE_LIB_OK=TRUE
OMP_NUM_THREADS=4
CUDA_VISIBLE_DEVICES=0
```

#### Critical Integration Points
1. **`src/tools.ts`**: Update audio transcription tool implementation
2. **`src/utils.ts`**: Add GPU detection and configuration utilities
3. **Error Handling**: Robust GPU failure → CPU fallback
4. **Testing**: Validate both GPU and CPU code paths

## 📊 Proven Performance Benchmarks

### RTX 3060 Test Results (15 audio files, 21KB-71KB)
- **Overall Speed**: 19.4x real-time
- **Peak Performance**: 29.8x real-time (48KB file)
- **Model Loading**: 0.70s (ultra-fast)
- **Processing Range**: 12.6x - 29.8x across different file sizes
- **Memory Efficiency**: <2GB VRAM usage

### File Size Performance Scaling
- **Large files (>35KB)**: 23.0x average speed ⭐
- **Medium files (25-35KB)**: 18.7x average speed
- **Small files (<25KB)**: 13.2x average speed

**Key Finding**: Performance scales positively with file size!

## 🛠️ Development Guidelines

### GPU-Specific Considerations
- **CUDA Environment**: Ensure CUDA 12.1+ with cuDNN 9.x
- **Memory Management**: Implement proper GPU memory cleanup
- **Error Handling**: Always provide CPU fallback
- **Testing**: Test both GPU and CPU code paths

### Code Quality Standards
- Use TypeScript for all new code
- Follow existing MCP server architecture
- Implement comprehensive error handling
- Add performance monitoring and logging
- Maintain backward compatibility

### Testing Requirements
- **GPU Tests**: `tests/gpu_acceleration/` contains complete test suite
- **Audio Samples**: `tests/audio_samples/github_friendly/` (5 small files for CI)
- **Performance Validation**: Must achieve >15x real-time on GPU
- **Fallback Testing**: CPU fallback must work reliably
- **Integration Testing**: Full MCP server functionality

## 🚀 CI/CD and Cloud Environment

### GitHub Actions Setup
- **GPU Runner Required**: For full GPU testing (`self-hosted` with CUDA)
- **CPU Testing**: Standard Ubuntu runners for fallback validation
- **Multi-platform**: Test Windows and Linux compatibility
- **Performance Monitoring**: Track processing speed benchmarks

### Docker Configuration
```dockerfile
FROM nvidia/cuda:12.3.2-cudnn9-runtime-ubuntu22.04
# CUDA environment with proper cuDNN for faster-whisper
```

### Security Considerations
- **Dependency Auditing**: Regular security scans
- **Environment Variables**: Secure handling of GPU configurations
- **Resource Limits**: Prevent GPU memory exhaustion

## 📁 Project Structure (Updated)

```
├── src/
│   ├── tools.ts              # 🔄 CRITICAL: Update audio tools with GPU
│   ├── index.ts              # Main MCP server entry point
│   ├── utils.ts              # 🔄 UPDATE: Add GPU detection utilities
│   └── UVX.ts                # Python environment management
├── tests/
│   ├── gpu_acceleration/     # ✅ Complete GPU test suite
│   │   ├── test_gpu_final.py          # Main GPU functionality test
│   │   ├── test_large_files_gpu.py    # Performance benchmark
│   │   ├── benchmark_gpu_vs_cpu.py    # Comparison testing
│   │   └── fix_gpu_acceleration.py    # Setup and troubleshooting
│   └── audio_samples/
│       └── github_friendly/  # ✅ Small test files (5 files, <35KB)
├── docs/
│   └── audio_enhancement/    # ✅ Complete technical documentation
│       ├── GPU_ACCELERATION_REPORT.md  # Performance results
│       └── TESTING_PROTOCOL.md         # Testing procedures
├── .github/
│   ├── copilot-instructions.md      # This file
│   ├── AUDIO_ENHANCEMENT_STATUS.md  # ✅ Project status overview
│   └── workflows/
│       └── audio-enhancement-ci.yml # ✅ Complete CI/CD pipeline
└── requirements-gpu.txt      # 📋 TODO: Create GPU dependencies file
```

## 🎯 Success Criteria

### Performance Requirements
- [x] GPU acceleration >15x real-time ✅ **Achieved 19.4x locally**
- [x] Model loading <2s ✅ **Achieved 0.7s locally**  
- [ ] MCP integration maintains functionality
- [ ] CPU fallback >2x real-time
- [ ] Processing error rate <5%

### Quality Metrics
- [x] Language detection >70% confidence ✅ **Achieved 73.3%**
- [ ] Transcription accuracy validation
- [ ] Memory efficiency <2GB VRAM
- [ ] Robust error handling across platforms

## 🚨 Critical Implementation Notes

### OpenMP Conflict Resolution
**REQUIRED**: Set `KMP_DUPLICATE_LIB_OK=TRUE` to resolve library conflicts
```bash
# This fixes: "OMP: Error #15: Initializing libiomp5md.dll"
export KMP_DUPLICATE_LIB_OK=TRUE
```

### NVIDIA Library Versions
**CRITICAL**: Use specific versions for CUDA 12 compatibility
- `nvidia-cudnn-cu12==9.*` (cuDNN 9.x for CUDA 12)
- `nvidia-cublas-cu12` (latest compatible)

### Fallback Strategy
```typescript
// Implementation pattern for robust fallback
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

## 📚 Resources Available

### Documentation
- **Performance Report**: `docs/audio_enhancement/GPU_ACCELERATION_REPORT.md`
- **Testing Guide**: `docs/audio_enhancement/TESTING_PROTOCOL.md`
- **Status Overview**: `.github/AUDIO_ENHANCEMENT_STATUS.md`

### Test Assets
- **Validated Test Files**: 5 small MP3 files in `tests/audio_samples/github_friendly/`
- **Complete Test Suite**: `tests/gpu_acceleration/` directory
- **Benchmark Results**: Proven 19.4x real-time performance

### CI/CD Framework
- **Complete Pipeline**: `.github/workflows/audio-enhancement-ci.yml`
- **Multi-environment Testing**: GPU, CPU, and integration tests
- **Performance Monitoring**: Automated benchmark validation

## Contributing Guidelines

### For GPU Audio Enhancement
1. **Priority**: Focus on `src/tools.ts` integration first
2. **Testing**: Always test both GPU and CPU code paths
3. **Performance**: Validate against benchmark targets
4. **Compatibility**: Ensure Windows and Linux support
5. **Documentation**: Update user-facing docs after integration

### General Development
- Create feature branches for new work
- Test thoroughly before submitting PRs
- Update documentation with changes
- Follow existing TypeScript code patterns
- Maintain MCP protocol compatibility

## Important Notes
- **GPU Implementation**: Complete and proven locally (19.4x performance)
- **Ready for Integration**: All technical groundwork completed
- **Cloud Testing**: Requires GPU-enabled GitHub runners
- **Backward Compatibility**: CPU fallback ensures universal compatibility
- **Performance Impact**: 94.8% time savings vs real-time processing

---

**Current Status**: Ready for GitHub Copilot cloud integration
**Next Phase**: MCP server integration with GPU acceleration
**Performance Validated**: 19.4x real-time on RTX 3060

*Last Updated: September 12, 2025 - GPU Enhancement Phase*
