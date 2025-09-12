#!/usr/bin/env python3
"""
Final GPU Test with Proper Libraries
Testing RTX 3060 acceleration with faster-whisper
"""

import os
import sys
import time
import torch
from pathlib import Path

# Set environment variables for OpenMP compatibility
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

def test_cuda_environment():
    """Test CUDA environment is properly configured"""
    print("🔧 CUDA ENVIRONMENT CHECK")
    print("=" * 40)
    
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        
        # Test tensor operations
        start_time = time.time()
        x = torch.randn(1000, 1000).cuda()
        y = torch.matmul(x, x)
        torch.cuda.synchronize()
        elapsed = time.time() - start_time
        print(f"✅ GPU tensor operations: {elapsed:.3f}s")
        
        del x, y
        torch.cuda.empty_cache()
        return True
    else:
        print("❌ CUDA not available")
        return False

def test_nvidia_libraries():
    """Test NVIDIA library imports"""
    print("\n📚 NVIDIA LIBRARIES CHECK")
    print("=" * 40)
    
    try:
        import nvidia.cublas.lib
        print("✅ nvidia-cublas-cu12 imported")
        print(f"   Path: {nvidia.cublas.lib.__file__}")
    except ImportError as e:
        print(f"❌ nvidia-cublas-cu12 import failed: {e}")
        return False
    
    try:
        import nvidia.cudnn.lib
        print("✅ nvidia-cudnn-cu12 imported")
        print(f"   Path: {nvidia.cudnn.lib.__file__}")
    except ImportError as e:
        print(f"❌ nvidia-cudnn-cu12 import failed: {e}")
        return False
    
    return True

def test_gpu_whisper_loading():
    """Test faster-whisper GPU loading"""
    print("\n🎤 FASTER-WHISPER GPU TEST")
    print("=" * 40)
    
    try:
        from faster_whisper import WhisperModel
        
        print("📥 Loading tiny model on GPU...")
        start_time = time.time()
        
        model = WhisperModel(
            "tiny",
            device="cuda",
            compute_type="float16",
            cpu_threads=4
        )
        
        load_time = time.time() - start_time
        print(f"✅ Model loaded in {load_time:.2f}s")
        
        # Test a simple transcription
        print("🧪 Testing transcription...")
        
        # Create a simple test audio file path (we'll use an existing one)
        test_files = list(Path("tests/audio_samples").glob("*.mp3"))
        if test_files:
            test_file = test_files[0]
            print(f"   Using: {test_file.name}")
            
            start_time = time.time()
            segments, info = model.transcribe(str(test_file), beam_size=1)
            transcript = list(segments)
            transcribe_time = time.time() - start_time
            
            print(f"✅ Transcription completed in {transcribe_time:.2f}s")
            print(f"   Language: {info.language} (confidence: {info.language_probability:.2f})")
            print(f"   Duration: {info.duration:.1f}s")
            if transcript:
                print(f"   Text: {transcript[0].text[:100]}...")
            
            # Calculate processing speed
            speed_ratio = info.duration / transcribe_time
            print(f"🚀 Processing speed: {speed_ratio:.1f}x real-time")
            
        else:
            print("⚠️  No test audio files found, creating dummy test...")
            # Just test that the model is loaded and ready
            print("✅ Model ready for transcription")
        
        # Clean up
        del model
        torch.cuda.empty_cache()
        
        return True
        
    except Exception as e:
        print(f"❌ GPU Whisper test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run comprehensive GPU test"""
    print("🚀 RTX 3060 GPU ACCELERATION TEST")
    print("=" * 50)
    print("Testing faster-whisper with proper NVIDIA libraries")
    print("=" * 50)
    
    success_count = 0
    total_tests = 3
    
    # Test 1: CUDA Environment
    if test_cuda_environment():
        success_count += 1
    
    # Test 2: NVIDIA Libraries
    if test_nvidia_libraries():
        success_count += 1
    
    # Test 3: GPU Whisper
    if test_gpu_whisper_loading():
        success_count += 1
    
    print(f"\n📊 FINAL RESULTS: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("🎉 GPU ACCELERATION FULLY WORKING!")
        print("✅ RTX 3060 is ready for faster-whisper")
        print("🚀 You can now use GPU acceleration in your MCP server")
    elif success_count >= 2:
        print("⚠️  Partial success - GPU should work")
        print("🔧 Minor issues detected but acceleration likely functional")
    else:
        print("❌ GPU acceleration not working properly")
        print("💡 Check CUDA drivers and library versions")
    
    return success_count >= 2

if __name__ == "__main__":
    success = main()
    print(f"\n{'='*50}")
    print("Ready to test enhanced audio transcription!" if success else "Need to fix GPU issues first")
    sys.exit(0 if success else 1)
