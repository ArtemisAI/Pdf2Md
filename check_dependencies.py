#!/usr/bin/env python3

"""
Check audio transcription dependencies
"""

try:
    import faster_whisper
    print("✅ faster-whisper available")
except ImportError as e:
    print("❌ faster-whisper not available:", str(e))

try:
    import torch
    print("✅ PyTorch available, version:", torch.__version__)
    print("   CUDA available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("   CUDA version:", torch.version.cuda)
        print("   GPU count:", torch.cuda.device_count())
        for i in range(torch.cuda.device_count()):
            print(f"   GPU {i}: {torch.cuda.get_device_name(i)}")
except ImportError as e:
    print("❌ PyTorch not available:", str(e))

try:
    import torchaudio
    print("✅ torchaudio available, version:", torchaudio.__version__)
except ImportError as e:
    print("❌ torchaudio not available:", str(e))

try:
    import transformers
    print("✅ transformers available, version:", transformers.__version__)
except ImportError as e:
    print("❌ transformers not available:", str(e))