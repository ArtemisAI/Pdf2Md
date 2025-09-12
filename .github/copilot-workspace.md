# GitHub Copilot Workspace Configuration

## Development Environment Setup

### Primary Development Context
- **Language**: TypeScript/Node.js for MCP server core
- **Audio Processing**: Python with faster-whisper integration
- **Build System**: Node.js with TypeScript compilation
- **Testing**: Jest for TypeScript, Python scripts for GPU validation

### IDE Configuration for Copilot
- **File Focus**: Keep `src/tools.ts`, `src/utils.ts`, and `src/index.ts` open
- **Context Files**: Reference `docs/audio_enhancement/` for technical specifications
- **Test Context**: Use `tests/gpu_acceleration/` for validation patterns

### Environment Variables Required
```bash
# Critical for GPU acceleration
KMP_DUPLICATE_LIB_OK=TRUE
OMP_NUM_THREADS=4
CUDA_VISIBLE_DEVICES=0
```

### Development Workflow
1. **Primary Focus**: `src/tools.ts` audio transcription tool integration
2. **GPU Detection**: `src/utils.ts` hardware capability detection
3. **Testing**: Validate with `tests/gpu_acceleration/test_gpu_final.py`
4. **Integration**: Test MCP functionality with existing test suite

### MCP Server Architecture Context
- **Server Entry**: `src/index.ts` - MCP server initialization
- **Tool Definitions**: `src/tools.ts` - All MCP tools including audio
- **Utilities**: `src/utils.ts` - Helper functions and configurations
- **Python Bridge**: Integration pattern for Python audio processing

### Performance Expectations
- **GPU Mode**: Target >15x real-time (proven 19.4x locally)
- **CPU Fallback**: Target >2x real-time for compatibility
- **Model Loading**: <2s initialization time
- **Memory Usage**: <2GB VRAM for optimal performance

### Code Patterns to Follow
```typescript
// Error handling with fallback
try {
  if (await detectGPU()) {
    return await processWithGPU(input);
  }
} catch (error) {
  console.warn('GPU processing failed, using CPU fallback:', error);
}
return await processWithCPU(input);
```

### Testing Strategy
- **Unit Tests**: TypeScript functions in `src/`
- **Integration Tests**: Python GPU acceleration in `tests/gpu_acceleration/`
- **Performance Tests**: Benchmark scripts for speed validation
- **MCP Tests**: End-to-end MCP protocol functionality

### Dependencies Management
- **Node.js**: Package management via `package.json`
- **Python**: GPU dependencies in `requirements-gpu.txt`
- **CUDA**: Specific library versions for compatibility
- **Cross-platform**: Windows and Linux environment support
