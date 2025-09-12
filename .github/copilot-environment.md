# GitHub Copilot Environment Configuration for Pdf2Md MCP Server

## Environment Variables Configuration

### Core MCP Server Environment
```bash
# Node.js and TypeScript configuration
NODE_ENV=development
UV_PATH=uv

# MCP Server Configuration
MCP_SERVER_NAME=Pdf2Md
MCP_SERVER_VERSION=0.1.0
MCP_SERVER_DESCRIPTION="GPU-accelerated file conversion to Markdown"
```

### GPU Acceleration Environment (Auto-detected)
```bash
# GPU Detection and Configuration
KMP_DUPLICATE_LIB_OK=TRUE            # Critical: Resolves OpenMP conflicts
OMP_NUM_THREADS=4                    # Optimal threading for CPU fallback
CUDA_VISIBLE_DEVICES=0               # GPU device selection
TORCH_CUDA_AVAILABLE=true            # Enable CUDA detection
NVIDIA_SMI_AVAILABLE=true            # NVIDIA management interface

# RTX 3060 Specific (Auto-detected in production)
GPU_MEMORY_GB=12                     # RTX 3060 VRAM
GPU_NAME="RTX 3060"                  # GPU identification
WHISPER_DEFAULT_LANGUAGE=en          # Default transcription language
```

### Performance Configuration
```bash
# Audio Processing Performance
WHISPER_MODEL_SIZE=medium            # Optimal for RTX 3060
WHISPER_BATCH_SIZE=8                 # RTX 3060 optimized
WHISPER_CHUNK_LENGTH=30              # Memory efficient chunks
WHISPER_DEVICE=auto                  # Auto GPU/CPU detection

# Memory Management
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
TOKENIZERS_PARALLELISM=false         # Avoid warnings
```

## Development Dependencies

### Node.js/TypeScript Stack
- **Node.js**: 20.x LTS
- **TypeScript**: ^5.6.2
- **Package Manager**: pnpm@10.10.0
- **MCP SDK**: @modelcontextprotocol/sdk@1.0.1

### Python GPU Stack
- **Python**: 3.11+
- **UV**: Latest (fast Python package manager)
- **PyTorch**: >=2.4.0+cu121 (CUDA 12.1 support)
- **Transformers**: >=4.36.0 (latest Whisper models)
- **faster-whisper**: >=1.0.0 (GPU optimization)

### Audio Processing Tools
- **FFmpeg**: Latest (audio format conversion)
- **Librosa**: >=0.10.0 (audio analysis)
- **Pydub**: >=0.25.1 (audio manipulation)

## GitHub Actions Runner Configuration

### Standard Runner (Default)
```yaml
runs-on: ubuntu-latest
```

### Larger Runner (For heavy testing)
```yaml
runs-on: ubuntu-4-core  # 4 CPU cores, 16GB RAM
```

### GPU Runner (For GPU testing)
```yaml
runs-on: self-hosted-gpu  # Custom GPU-enabled runner
```

## Testing Environment

### Test Files Structure
```
tests/
├── audio_samples/
│   ├── github_friendly/     # Small files for CI (<35KB)
│   │   ├── sample1.mp3     # 21KB - English speech
│   │   ├── sample2.wav     # 28KB - Multi-language
│   │   ├── sample3.flac    # 31KB - High quality
│   │   ├── sample4.ogg     # 24KB - Compressed
│   │   └── sample5.m4a     # 33KB - Mobile format
│   └── cv_sample/          # Comprehensive test suite
├── gpu_acceleration/       # GPU testing scripts
├── integration/           # MCP integration tests
└── performance/          # Benchmark tests
```

### Environment-Specific Test Commands
```bash
# CI/CD Environment (CPU fallback)
uv run python tests/gpu_acceleration/test_cpu_fallback.py

# Development Environment (GPU if available)
uv run python tests/gpu_acceleration/test_gpu_final.py

# Performance Benchmarking
uv run python tests/gpu_acceleration/benchmark_gpu_vs_cpu.py

# MCP Integration Testing
node tests/test_enhanced_audio.js
```

## GitHub Copilot Agent Integration

### Agent Environment Setup
The GitHub Copilot coding agent will have access to:

1. **Pre-installed Dependencies**: All Node.js, Python, and audio processing tools
2. **Environment Variables**: GPU acceleration and MCP server configuration
3. **Test Suite**: Complete testing framework for validation
4. **Build Tools**: TypeScript compilation and Python package management

### Agent Capabilities
- **Code Generation**: TypeScript/Python for MCP tools and GPU acceleration
- **Testing**: Automated test execution and validation
- **Debugging**: Error analysis and performance optimization
- **Documentation**: Code comments and API documentation

### Agent Context Files
- `.github/copilot-instructions.md`: Agent persona and development focus
- `.github/copilot-context.md`: Repository context and benchmarks
- `.github/mcp-context.md`: MCP server integration patterns
- `.github/copilot-workspace.md`: Development environment details

## Security Configuration

### Environment Secrets (GitHub Actions)
```yaml
# Repository secrets for Copilot environment
secrets:
  HUGGINGFACE_TOKEN: ${{ secrets.HUGGINGFACE_TOKEN }}
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Environment Variables (GitHub Actions)
```yaml
# Repository variables for Copilot environment
variables:
  UV_PATH: "uv"
  NODE_ENV: "development"
  KMP_DUPLICATE_LIB_OK: "TRUE"
  OMP_NUM_THREADS: "4"
```

## Performance Targets

### GPU Acceleration Benchmarks
- **RTX 3060**: 19.4x real-time processing (achieved locally)
- **Peak Performance**: 29.8x real-time on optimized files
- **Model Loading**: <2s initialization time
- **Memory Usage**: <2GB VRAM for medium model

### CPU Fallback Benchmarks
- **Processing Speed**: >2x real-time
- **Memory Usage**: <4GB RAM
- **Compatibility**: 100% feature parity with GPU mode

### MCP Server Performance
- **Tool Response Time**: <500ms for small files
- **Large File Processing**: Progress reporting and async handling
- **Error Rate**: <5% with automatic fallback

## Development Workflow

### Local Development
1. Install dependencies: `pnpm install && uv sync`
2. Build server: `pnpm run build`
3. Test MCP integration: VS Code with `.vscode/mcp.json`
4. Run tests: `pnpm test` and `uv run python tests/gpu_acceleration/`

### Copilot Agent Development
1. Environment auto-setup via `copilot-setup-steps.yml`
2. Automatic dependency installation and caching
3. GPU detection and fallback configuration
4. Complete test suite validation

### CI/CD Pipeline
1. Standard GitHub Actions with CPU fallback
2. Performance benchmarking and validation
3. MCP server integration testing
4. Documentation generation and updates

This configuration ensures GitHub Copilot has complete context and environment setup for autonomous development of the GPU-accelerated audio transcription features.
