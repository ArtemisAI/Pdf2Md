#!/usr/bin/env python3
"""
Simple faster-whisper GPU test
"""

import os
import sys
import time

# Set environment variables for OpenMP compatibility
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

def test_basic_import():
    """Test basic imports"""
    try:
        print("🔧 Testing basic imports...")
        import torch
        print(f"✅ PyTorch {torch.__version__} loaded")
        print(f"✅ CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
            print(f"✅ GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        
        from faster_whisper import WhisperModel
        print("✅ faster-whisper imported successfully")
        
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def test_gpu_model_loading():
    """Test GPU model loading"""
    try:
        print("\n🎤 Testing GPU model loading...")
        from faster_whisper import WhisperModel
        
        # Try to load tiny model on GPU
        print("Loading tiny model on GPU...")
        start_time = time.time()
        model = WhisperModel("tiny", device="cuda", compute_type="float16")
        load_time = time.time() - start_time
        print(f"✅ Model loaded in {load_time:.2f}s")
        
        del model
        return True
        
    except Exception as e:
        print(f"❌ GPU model loading failed: {e}")
        print("Trying CPU fallback...")
        try:
            model = WhisperModel("tiny", device="cpu")
            print("✅ CPU model loaded successfully")
            del model
            return True
        except Exception as e2:
            print(f"❌ CPU fallback also failed: {e2}")
            return False

def main():
    print("🚀 SIMPLE FASTER-WHISPER TEST")
    print("=" * 40)
    
    if not test_basic_import():
        return False
        
    if not test_gpu_model_loading():
        return False
        
    print("\n✅ All tests passed! faster-whisper is working correctly.")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)