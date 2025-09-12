# MCP Server Configuration for GitHub Copilot

## Model Context Protocol (MCP) Overview

This server implements the Model Context Protocol to provide file conversion capabilities, with a focus on high-performance audio transcription.

### MCP Server Architecture

#### Server Initialization (`src/index.ts`)
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Server configuration with audio tools
const server = new Server(
  {
    name: 'pdf2md-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

#### Tool Registration Pattern (`src/tools.ts`)
```typescript
// Current audio tool (needs GPU acceleration)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'audio_transcribe',
      description: 'Transcribe audio files to text using Whisper',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path to audio file' }
        }
      }
    }
    // ... other tools
  ]
}));
```

### Audio Transcription Tool Enhancement

#### Current Implementation (CPU-only)
```typescript
// src/tools.ts - Current whisper implementation
case 'audio_transcribe':
  const audioPath = args.path as string;
  const transcript = await transcribeAudio(audioPath);
  return { content: [{ type: 'text', text: transcript }] };
```

#### Target GPU Implementation
```typescript
// Enhanced implementation with GPU acceleration
case 'audio_transcribe':
  const audioPath = args.path as string;
  const options = {
    useGPU: await detectGPU(),
    modelSize: 'tiny',
    device: 'auto'
  };
  const transcript = await transcribeAudioEnhanced(audioPath, options);
  return { 
    content: [{ 
      type: 'text', 
      text: transcript.text,
      metadata: {
        processingTime: transcript.processingTime,
        device: transcript.device,
        language: transcript.language,
        confidence: transcript.confidence
      }
    }] 
  };
```

### GPU Integration Requirements

#### Python Process Management
```typescript
// Pattern for GPU-accelerated transcription
async function transcribeAudioEnhanced(
  filePath: string, 
  options: AudioTranscriptionOptions
): Promise<TranscriptionResult> {
  
  const pythonScript = path.join(__dirname, '../scripts/gpu_transcribe.py');
  const args = [
    pythonScript,
    filePath,
    '--device', options.device,
    '--model-size', options.modelSize
  ];
  
  // Set environment variables for GPU
  const env = {
    ...process.env,
    KMP_DUPLICATE_LIB_OK: 'TRUE',
    OMP_NUM_THREADS: '4'
  };
  
  try {
    const result = await execFile('python', args, { env });
    return JSON.parse(result.stdout);
  } catch (error) {
    if (options.device === 'cuda') {
      // Fallback to CPU
      return transcribeAudioEnhanced(filePath, { ...options, device: 'cpu' });
    }
    throw error;
  }
}
```

#### Python Script Integration (`scripts/gpu_transcribe.py`)
```python
#!/usr/bin/env python3
"""
GPU-accelerated audio transcription for MCP server
Integrates with faster-whisper for optimal performance
"""

import os
import sys
import json
import time
from faster_whisper import WhisperModel

# Environment setup for GPU compatibility
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

def transcribe_audio(file_path, device='auto', model_size='tiny'):
    """
    Transcribe audio using faster-whisper with GPU acceleration
    """
    start_time = time.time()
    
    try:
        # Load model with GPU acceleration
        model = WhisperModel(
            model_size,
            device=device,
            compute_type="float16" if device == "cuda" else "int8"
        )
        
        # Transcribe audio
        segments, info = model.transcribe(file_path)
        
        # Collect results
        transcript_text = " ".join([segment.text for segment in segments])
        processing_time = time.time() - start_time
        
        result = {
            "text": transcript_text.strip(),
            "language": info.language,
            "confidence": info.language_probability,
            "duration": info.duration,
            "processing_time": processing_time,
            "device": device,
            "model_size": model_size,
            "speed_ratio": info.duration / processing_time if processing_time > 0 else 0
        }
        
        return result
        
    except Exception as e:
        # Return error for MCP server to handle
        return {
            "error": str(e),
            "device": device,
            "fallback_required": device == "cuda"
        }

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='GPU-accelerated audio transcription')
    parser.add_argument('file_path', help='Path to audio file')
    parser.add_argument('--device', default='auto', choices=['cuda', 'cpu', 'auto'])
    parser.add_argument('--model-size', default='tiny', choices=['tiny', 'base', 'small'])
    
    args = parser.parse_args()
    
    result = transcribe_audio(args.file_path, args.device, args.model_size)
    print(json.dumps(result))
```

### MCP Protocol Compatibility

#### Request/Response Pattern
```typescript
// MCP tool execution pattern
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'audio_transcribe':
      return await handleAudioTranscription(args);
    // ... other tools
  }
});
```

#### Error Handling for MCP
```typescript
async function handleAudioTranscription(args: any) {
  try {
    const result = await transcribeAudioEnhanced(args.path, {
      useGPU: true,
      device: 'auto',
      modelSize: 'tiny'
    });
    
    if (result.error) {
      return {
        content: [{
          type: 'text',
          text: `Transcription failed: ${result.error}`
        }],
        isError: true
      };
    }
    
    return {
      content: [{
        type: 'text',
        text: result.text
      }],
      metadata: {
        performance: {
          processingTime: result.processing_time,
          speedRatio: result.speed_ratio,
          device: result.device
        },
        audio: {
          language: result.language,
          confidence: result.confidence,
          duration: result.duration
        }
      }
    };
    
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Audio transcription error: ${error.message}`
      }],
      isError: true
    };
  }
}
```

### Performance Monitoring

#### Add Processing Metrics
```typescript
interface TranscriptionMetrics {
  processingTime: number;
  speedRatio: number;
  device: 'cuda' | 'cpu';
  modelSize: string;
  memoryUsed?: number;
  languageConfidence: number;
}

// Log performance for monitoring
function logTranscriptionMetrics(metrics: TranscriptionMetrics) {
  console.log(`Audio transcription: ${metrics.speedRatio.toFixed(1)}x real-time on ${metrics.device}`);
  if (metrics.device === 'cuda') {
    console.log(`GPU memory used: ${metrics.memoryUsed}MB`);
  }
}
```

### Integration Checklist

#### MCP Server Updates Required:
- [ ] **Update `src/tools.ts`** - Replace whisper with faster-whisper integration
- [ ] **Add `src/utils.ts`** - GPU detection and configuration utilities
- [ ] **Create `scripts/gpu_transcribe.py`** - Python GPU transcription script
- [ ] **Update `src/index.ts`** - Enhanced server initialization if needed
- [ ] **Add error handling** - Robust GPU/CPU fallback mechanisms
- [ ] **Performance logging** - Add metrics and monitoring

#### Testing Integration:
- [ ] **MCP protocol tests** - Ensure tool responses are valid
- [ ] **GPU acceleration tests** - Validate performance targets
- [ ] **Fallback testing** - CPU compatibility verification
- [ ] **Error handling tests** - Invalid inputs and GPU failures

#### Documentation Updates:
- [ ] **Tool descriptions** - Update MCP tool documentation
- [ ] **Performance specs** - Document GPU acceleration benefits
- [ ] **Setup instructions** - GPU environment configuration
- [ ] **API compatibility** - Confirm no breaking changes

---

**Note**: The MCP server architecture is designed for easy integration. Focus on enhancing the audio transcription tool while maintaining full protocol compatibility.
