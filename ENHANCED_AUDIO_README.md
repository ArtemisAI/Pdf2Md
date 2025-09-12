# Enhanced Audio Transcription for Pdf2Md MCP Server

This document describes the enhanced audio transcription system implemented for the Pdf2Md MCP server, featuring RTX 3060 optimizations and GPU-aware processing.

## Features

### 🚀 RTX 3060 Optimized Performance
- **GPU Memory Detection**: Automatically detects available VRAM and selects optimal model size
- **Model Selection**: 
  - RTX 3060 (12GB): `medium` model with batch size 8
  - Lower VRAM GPUs: Automatically downgrades to smaller models
  - CPU Fallback: Uses `base` model with optimized settings
- **Float16 Acceleration**: Uses half-precision for 2x speed improvement on compatible GPUs

### 🛡️ Advanced Error Handling
- **GPU Fallback**: Automatically switches to CPU when GPU memory is exhausted
- **Memory Optimization**: Dynamic batch size adjustment and memory cleanup
- **Retry Logic**: Intelligent retry with different configurations
- **User-Friendly Messages**: Clear error descriptions with recovery suggestions

### 📊 Real-Time Progress Tracking
- **Stage-by-Stage Updates**: Detailed progress through initialization, model loading, transcription
- **Progress Callbacks**: Real-time progress updates for UI integration
- **Task Status**: Check status of asynchronous transcription tasks

### 🎵 Enhanced Audio Processing
- **Format Support**: MP3, WAV, FLAC, OGG, M4A, AAC, MP4, WebM, MKV
- **Auto-Conversion**: Automatic conversion to optimal formats using FFmpeg
- **Duration Detection**: Accurate audio duration calculation
- **File Validation**: Comprehensive file format and size validation

### ⚡ Asynchronous Processing
- **Task Queue**: Non-blocking audio transcription processing
- **Status Checking**: Query task status and retrieve results
- **Concurrent Processing**: Handle multiple transcription requests

## New MCP Tools

### 1. Enhanced Audio to Markdown (`enhanced-audio-to-markdown`)

**Purpose**: Convert audio files to markdown with GPU-optimized transcription

**Parameters**:
- `filepath` (required): Absolute path to the audio file
- `language` (optional): Language code (e.g., 'en', 'es', 'fr'). Defaults to 'en'
- `modelSize` (optional): Whisper model size. Auto-selected if not specified
  - Options: `tiny`, `base`, `small`, `medium`, `large`, `large-v2`, `large-v3`
- `device` (optional): Processing device. Defaults to 'auto'
  - Options: `auto`, `cpu`, `cuda`, `cuda:0`
- `asyncMode` (optional): Process asynchronously and return task ID
- `uvPath` (optional): Path to UV executable

**Example Usage**:
```json
{
  "name": "enhanced-audio-to-markdown",
  "arguments": {
    "filepath": "/path/to/audio.mp3",
    "language": "en",
    "asyncMode": false
  }
}
```

### 2. Audio Transcription Status (`audio-transcription-status`)

**Purpose**: Check status of asynchronous transcription tasks

**Parameters**:
- `taskId` (required): Task ID returned from async transcription

**Example Usage**:
```json
{
  "name": "audio-transcription-status",
  "arguments": {
    "taskId": "task_1699123456789_abc123"
  }
}
```

## Hardware Optimizations

### RTX 3060 Specific Settings
```typescript
// Automatically detected configuration for RTX 3060
{
  modelSize: 'medium',     // Optimal for 12GB VRAM
  device: 'cuda:0',        // GPU acceleration
  torch_dtype: 'float16',  // Half precision for speed
  batch_size: 8,           // RTX 3060 optimized
  chunk_length_s: 30,      // Memory efficient chunks
  low_cpu_mem_usage: true, // Minimize CPU memory usage
  use_safetensors: true    // Faster model loading
}
```

### Memory Management
- **Dynamic VRAM Detection**: Queries GPU memory and adjusts settings
- **Automatic Cleanup**: Clears GPU cache between operations
- **Graceful Degradation**: CPU fallback when GPU resources unavailable
- **Batch Size Optimization**: Adjusts batch size based on available memory

### GPU Fallback Strategy
1. **Primary**: Try GPU with optimal settings
2. **Fallback 1**: Reduce batch size and model size
3. **Fallback 2**: Switch to CPU with optimized settings
4. **Error Recovery**: Clear memory and retry with conservative settings

## Architecture Components

### 1. ConfigManager
- **GPU Detection**: Automatically detects optimal hardware configuration
- **Model Selection**: Chooses appropriate Whisper model based on VRAM
- **RTX 3060 Optimizations**: Specific tuning for RTX 3060 12GB cards

### 2. EnhancedAudioTranscription
- **Core Engine**: Main transcription processing with GPU optimization
- **Python Integration**: Seamless integration with Python Whisper models
- **Fallback Handling**: Automatic retry with different configurations

### 3. GPUAwareErrorHandler
- **Smart Error Recovery**: Identifies GPU-specific errors and provides solutions
- **User-Friendly Messages**: Clear error descriptions with actionable advice
- **Automatic Fallback**: Triggers CPU fallback when appropriate

### 4. TranscriptionQueue
- **Async Processing**: Non-blocking transcription task management
- **Status Tracking**: Real-time task status and progress monitoring
- **Result Management**: Efficient storage and retrieval of transcription results

### 5. ProgressReporter
- **Real-Time Updates**: Live progress reporting during transcription
- **Stage Tracking**: Detailed progress through each transcription phase
- **Callback System**: Flexible progress notification system

### 6. AudioFileProcessor
- **Format Validation**: Comprehensive audio format support and validation
- **Auto-Conversion**: Automatic conversion to optimal formats
- **Metadata Extraction**: Duration, bitrate, and format information

## Performance Benchmarks

### Expected Performance (RTX 3060)
- **Model Loading**: ~3-5 seconds (cached after first load)
- **Transcription Speed**: ~2-3x real-time (30 min audio in ~10-15 min)
- **Memory Usage**: ~6-8GB VRAM for medium model
- **CPU Fallback**: ~0.5-1x real-time (slower but reliable)

### Supported Audio Formats
- **Primary**: MP3, WAV, FLAC (best performance)
- **Secondary**: OGG, M4A, AAC (auto-converted)
- **Video**: MP4, WebM, MKV (audio extraction)

## Environment Variables

Configure the system using environment variables:

```bash
# GPU Configuration
export CUDA_VISIBLE_DEVICES="0"          # Use specific GPU
export GPU_MEMORY_GB="12"                 # Manually set GPU memory
export GPU_NAME="RTX 3060"                # GPU identification

# Whisper Configuration  
export WHISPER_DEFAULT_LANGUAGE="en"      # Default transcription language
export WHISPER_MODEL_SIZE="medium"        # Force specific model size

# UV Configuration
export UV_PATH="/path/to/uv"              # Custom UV executable path
```

## Integration Examples

### Synchronous Transcription
```javascript
// Direct transcription with immediate result
const result = await server.callTool({
  name: "enhanced-audio-to-markdown",
  arguments: {
    filepath: "/path/to/meeting.mp3",
    language: "en",
    asyncMode: false
  }
});

console.log("Transcription:", result.content[2].text);
```

### Asynchronous Transcription
```javascript
// Start async transcription
const taskResponse = await server.callTool({
  name: "enhanced-audio-to-markdown", 
  arguments: {
    filepath: "/path/to/long_audio.mp3",
    asyncMode: true
  }
});

const taskId = taskResponse.content[1].text.split(": ")[1];

// Check status periodically
const statusResponse = await server.callTool({
  name: "audio-transcription-status",
  arguments: { taskId }
});

console.log("Status:", statusResponse.content[0].text);
```

## Troubleshooting

### Common Issues

**1. GPU Memory Errors**
- **Symptoms**: "CUDA out of memory" errors
- **Solution**: System automatically switches to CPU fallback
- **Manual Fix**: Set smaller model size or reduce batch size

**2. Model Loading Failures**
- **Symptoms**: "Failed to load model" errors  
- **Solution**: Check internet connection for model downloads
- **Manual Fix**: Pre-download models or use smaller model sizes

**3. Audio Format Issues**
- **Symptoms**: "Could not decode" errors
- **Solution**: System attempts automatic conversion
- **Manual Fix**: Convert audio to WAV or MP3 format manually

**4. Long Processing Times**
- **Symptoms**: Transcription takes too long
- **Solution**: Use async mode for long files
- **Optimization**: Ensure GPU drivers are updated

### Performance Tuning

**For RTX 3060 Users**:
```bash
# Optimal settings for RTX 3060
export GPU_MEMORY_GB="12"
export WHISPER_MODEL_SIZE="medium"  
# System will auto-detect and optimize
```

**For Lower-End GPUs**:
```bash
# Conservative settings for 8GB VRAM
export GPU_MEMORY_GB="8"
export WHISPER_MODEL_SIZE="small"
```

**For CPU-Only Systems**:
```bash
# Force CPU processing
export CUDA_VISIBLE_DEVICES=""
export WHISPER_MODEL_SIZE="base"
```

## Dependencies

### Python Dependencies (automatically installed)
- `openai-whisper>=20231117` - Core Whisper model
- `torch>=2.1.0` - PyTorch for GPU acceleration
- `torchaudio>=2.1.0` - Audio processing
- `transformers>=4.36.0` - Hugging Face transformers
- `faster-whisper>=0.10.0` - Optimized Whisper implementation
- `pydub>=0.25.1` - Audio manipulation
- `ffmpeg-python>=0.2.0` - Audio format conversion

### System Dependencies
- **FFmpeg**: Required for audio format conversion
- **NVIDIA Drivers**: Required for GPU acceleration
- **CUDA Toolkit**: Required for GPU processing (auto-detected)

## Migration from Original Audio Tool

The enhanced audio transcription system maintains backward compatibility:

### Original Tool (`audio-to-markdown`)
- Still available and functional
- Uses basic markitdown processing
- Limited error handling
- No GPU optimization

### Enhanced Tool (`enhanced-audio-to-markdown`)  
- GPU-optimized processing
- Advanced error handling
- Real-time progress tracking
- Async processing support
- Better audio format support

**Migration Path**: Simply replace `audio-to-markdown` with `enhanced-audio-to-markdown` in your tool calls for immediate performance improvements.

## Future Enhancements

- **Multi-GPU Support**: Utilize multiple GPUs for faster processing
- **Streaming Transcription**: Real-time audio transcription
- **Speaker Diarization**: Identify different speakers in audio
- **Custom Model Support**: Use fine-tuned Whisper models
- **Audio Preprocessing**: Noise reduction and audio enhancement