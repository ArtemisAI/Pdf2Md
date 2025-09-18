# GPU Audio Transcription Compatibility Issue

**Date:** 2025-09-17

## Summary

When attempting to perform GPU-accelerated audio transcription using `faster-whisper` and PyTorch, the system fails with errors indicating "GPU memory insufficient". Further investigation shows these errors are actually caused by incompatible cuDNN library versions, not by lack of VRAM.

## Environment

- **OS:** Linux (bash shell)
- **GPU:** NVIDIA GeForce RTX 3090 (23.6 GB VRAM)
- **CUDA:** 12.1
- **Python venv**
  - PyTorch: 2.5.1+cu121
  - cuDNN: 9.01.00
- **UVX/`uv run` environment**
  - PyTorch: 2.8.0+cu121
  - cuDNN: 9.10.02
- **Node.js:** v20.19.4
- **TypeScript/Server:** v0.0.2
- **Key dependencies:** `faster-whisper`, `torch`, `nvidia-cudnn-cu12`, `nvidia-cublas-cu12`

## Diagnostics & Logs

### Error Output
```
[enhanced_transcribe] Transcription stderr:
Processing audio file: tests/audio_samples/.../test_002_duration_21kb.mp3
Unable to load any of {libcudnn_ops.so.9.1.0, libcudnn_ops.so.9.1, libcudnn_ops.so.9, libcudnn_ops.so}
Invalid handle. Cannot load symbol cudnnCreateTensorDescriptor
Aborted (SIGABRT)
``` 

### Root Cause
- The venv environment ships cuDNN 9.01.00; the `uv run` environment uses cuDNN 9.10.02.
- Symbol names in cuDNN 9.1.x do not match, causing library load failures that are misreported as GPU memory errors.

### Repro Steps
1. Activate venv: `source .venv/bin/activate`
2. Install dependencies: `pip install torch==2.5.1+cu121 faster-whisper nvidia-cudnn-cu12 nvidia-cublas-cu12`
3. Build and run test: `pnpm run build && node test_direct_enhanced_audio.js`
4. Observe cuDNN load errors in stderr.

### Attempts & Workarounds Tried
- Inherited host `process.env` into Python subprocess (no effect)
- Switched from `uv run` to direct venv invocation (no effect)
- Updated `src/audio/EnhancedAudioTranscription.ts` to force CPU fallback

## Impact
- GPU-accelerated transcription is currently non-functional.
- All audio transcription tests fall back to CPU mode, resulting in performance reduction (~0.7× real-time instead of >15× on GPU).

## Next Steps
1. Align cuDNN versions between environments (update venv to cuDNN 9.10+ or downgrade UV environment to cuDNN 9.01).
2. Reinstall or rebuild PyTorch with matching cuDNN binaries.
3. Update installation scripts (`requirements-gpu.txt`, `setup.sh`) to enforce consistent cuDNN target.
4. Remove temporary CPU-only fallback when GPU mode is restored.
5. Add CI check for library version consistency.

---
*Issue logged by GitHub Copilot on HTTP-MCP branch.*
