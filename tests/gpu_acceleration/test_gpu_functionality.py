#!/usr/bin/env python3
"""
GPU Audio Transcription Testing Suite
Test CUDA functionality with our enhanced audio system
"""

import torch
import sys
import os
import time
import psutil
import subprocess

def test_gpu_basic():
    """Test basic GPU functionality"""
    print("🧪 TESTING: Basic GPU Functionality")
    print("=" * 50)
    
    # Test 1: CUDA availability
    print(f"✓ PyTorch version: {torch.__version__}")
    print(f"✓ CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"✓ CUDA version: {torch.version.cuda}")
        print(f"✓ GPU count: {torch.cuda.device_count()}")
        print(f"✓ GPU name: {torch.cuda.get_device_name(0)}")
        print(f"✓ GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        
        # Test GPU memory allocation
        print("\n🔧 Testing GPU memory allocation...")
        try:
            # Create a small tensor on GPU
            x = torch.randn(100, 100).cuda()
            print(f"✓ GPU tensor created: {x.device}")
            print(f"✓ GPU memory allocated: {torch.cuda.memory_allocated(0) / 1024**2:.1f} MB")
            
            # Clear memory
            del x
            torch.cuda.empty_cache()
            print("✓ GPU memory cleared")
            
        except Exception as e:
            print(f"❌ GPU memory test failed: {e}")
            return False
            
        return True
    else:
        print("❌ CUDA not available")
        return False

def test_whisper_imports():
    """Test if we can import whisper-related packages"""
    print("\n🧪 TESTING: Whisper Package Imports")
    print("=" * 50)
    
    packages = [
        ('transformers', 'Transformers library'),
        ('faster_whisper', 'Faster Whisper'),
        ('torch', 'PyTorch'),
        ('torchaudio', 'TorchAudio')
    ]
    
    success = True
    for package, name in packages:
        try:
            __import__(package)
            print(f"✓ {name}: OK")
        except ImportError as e:
            print(f"❌ {name}: Failed - {e}")
            success = False
    
    return success

def test_gpu_whisper_model():
    """Test loading a small Whisper model on GPU"""
    print("\n🧪 TESTING: GPU Whisper Model Loading")
    print("=" * 50)
    
    try:
        from faster_whisper import WhisperModel
        
        # Test with tiny model first
        print("📥 Loading tiny Whisper model on GPU...")
        start_time = time.time()
        
        model = WhisperModel("tiny", device="cuda", compute_type="float16")
        load_time = time.time() - start_time
        
        print(f"✓ Model loaded in {load_time:.2f} seconds")
        print(f"✓ Model device: cuda")
        print(f"✓ Compute type: float16")
        
        # Check GPU memory usage
        if torch.cuda.is_available():
            memory_used = torch.cuda.memory_allocated(0) / 1024**2
            print(f"✓ GPU memory used: {memory_used:.1f} MB")
        
        # Clean up
        del model
        torch.cuda.empty_cache()
        print("✓ Model unloaded and memory cleared")
        
        return True
        
    except Exception as e:
        print(f"❌ GPU Whisper model test failed: {e}")
        return False

def monitor_system_resources():
    """Monitor system resources during testing"""
    print("\n📊 SYSTEM RESOURCES:")
    print("-" * 30)
    
    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    print(f"CPU Usage: {cpu_percent}%")
    
    # Memory usage
    memory = psutil.virtual_memory()
    print(f"RAM Usage: {memory.percent}% ({memory.used / 1024**3:.1f}GB / {memory.total / 1024**3:.1f}GB)")
    
    # GPU memory if CUDA available
    if torch.cuda.is_available():
        gpu_memory = torch.cuda.memory_allocated(0) / 1024**2
        gpu_total = torch.cuda.get_device_properties(0).total_memory / 1024**2
        print(f"GPU Memory: {gpu_memory:.1f}MB / {gpu_total:.1f}MB")

def main():
    """Run all GPU tests"""
    print("🚀 GPU AUDIO TRANSCRIPTION TESTING")
    print("=" * 60)
    
    # Monitor initial state
    monitor_system_resources()
    
    # Run tests
    tests = [
        ("Basic GPU Functionality", test_gpu_basic),
        ("Whisper Package Imports", test_whisper_imports),
        ("GPU Whisper Model Loading", test_gpu_whisper_model)
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results[test_name] = False
    
    # Final system state
    print("\n📊 FINAL SYSTEM STATE:")
    monitor_system_resources()
    
    # Summary
    print("\n📋 TEST SUMMARY:")
    print("=" * 40)
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    overall_success = all(results.values())
    print(f"\n🎯 OVERALL: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    return overall_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
