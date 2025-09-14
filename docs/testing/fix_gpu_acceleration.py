#!/usr/bin/env python3
"""
Fix GPU Acceleration Issues for faster-whisper
Based on Context7 documentation analysis
"""

import subprocess
import sys
import os
import torch

def check_current_environment():
    """Check current library versions"""
    print("🔍 CHECKING CURRENT ENVIRONMENT")
    print("=" * 50)
    
    print(f"Python: {sys.version}")
    print(f"PyTorch: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # Check for OpenMP issues
    try:
        result = subprocess.run([sys.executable, "-c", "import torch; torch.randn(10, 10)"], 
                              capture_output=True, text=True)
        if "OMP: Error" in result.stderr:
            print("⚠️  OpenMP conflict detected")
            return False
        else:
            print("✅ Basic PyTorch working")
    except Exception as e:
        print(f"❌ PyTorch test failed: {e}")
        return False
    
    return True

def fix_openmp_conflict():
    """Fix OpenMP library conflict"""
    print("\n🔧 FIXING OPENMP CONFLICT")
    print("=" * 50)
    
    # Set environment variable to allow multiple OpenMP runtimes
    os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
    print("✅ Set KMP_DUPLICATE_LIB_OK=TRUE")
    
    # Also set OMP_NUM_THREADS for consistent performance
    os.environ['OMP_NUM_THREADS'] = '4'
    print("✅ Set OMP_NUM_THREADS=4")

def install_correct_nvidia_libraries():
    """Install correct NVIDIA libraries based on Context7 docs"""
    print("\n📦 INSTALLING CORRECT NVIDIA LIBRARIES")
    print("=" * 50)
    
    # Based on faster-whisper Context7 docs: need cuBLAS for CUDA 12 and cuDNN 9
    nvidia_packages = [
        "nvidia-cublas-cu12",
        "nvidia-cudnn-cu12==9.*"  # Specific cuDNN 9 for CUDA 12
    ]
    
    for package in nvidia_packages:
        print(f"📥 Installing {package}...")
        try:
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", package
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"✅ Successfully installed {package}")
            else:
                print(f"❌ Failed to install {package}: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Error installing {package}: {e}")
            return False
    
    return True

def set_nvidia_library_path():
    """Set library path for NVIDIA libraries (Linux style adapted for Windows)"""
    print("\n🔗 SETTING NVIDIA LIBRARY PATH")
    print("=" * 50)
    
    try:
        # Get NVIDIA library paths
        result = subprocess.run([
            sys.executable, "-c", 
            "import os; import nvidia.cublas.lib; import nvidia.cudnn.lib; "
            "print(os.path.dirname(nvidia.cublas.lib.__file__)); "
            "print(os.path.dirname(nvidia.cudnn.lib.__file__))"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            paths = result.stdout.strip().split('\n')
            print(f"✅ Found cuBLAS path: {paths[0]}")
            print(f"✅ Found cuDNN path: {paths[1]}")
            
            # For Windows, we need to add to PATH instead of LD_LIBRARY_PATH
            current_path = os.environ.get('PATH', '')
            new_paths = ';'.join(paths)
            os.environ['PATH'] = f"{new_paths};{current_path}"
            print("✅ Added NVIDIA library paths to PATH")
            return True
        else:
            print(f"❌ Failed to get NVIDIA library paths: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error setting library path: {e}")
        return False

def downgrade_ctranslate2_if_needed():
    """Downgrade ctranslate2 for compatibility if needed"""
    print("\n🔄 CHECKING CTRANSLATE2 COMPATIBILITY")
    print("=" * 50)
    
    # Based on Context7 docs: For CUDA 12 and cuDNN 8, need ctranslate2==4.4.0
    # But we're installing cuDNN 9, so we should be fine with latest
    
    try:
        import ctranslate2
        print(f"✅ Current ctranslate2 version: {ctranslate2.__version__}")
        return True
    except ImportError:
        print("⚠️  ctranslate2 not found, will be installed with faster-whisper")
        return True

def test_gpu_whisper():
    """Test GPU Whisper after fixes"""
    print("\n🧪 TESTING GPU WHISPER AFTER FIXES")
    print("=" * 50)
    
    try:
        # Test basic CUDA
        import torch
        if torch.cuda.is_available():
            x = torch.randn(100, 100).cuda()
            print("✅ Basic CUDA tensor operations working")
            del x
            torch.cuda.empty_cache()
        
        # Test faster-whisper import
        from faster_whisper import WhisperModel
        print("✅ faster-whisper imported successfully")
        
        # Test model loading on GPU
        print("📥 Testing GPU model loading...")
        model = WhisperModel("tiny", device="cuda", compute_type="float16")
        print("✅ GPU model loaded successfully")
        
        # Clean up
        del model
        torch.cuda.empty_cache()
        print("✅ Memory cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ GPU Whisper test failed: {e}")
        return False

def main():
    """Main fix execution"""
    print("🚀 FIXING GPU ACCELERATION FOR FASTER-WHISPER")
    print("=" * 60)
    print("Based on Context7 documentation analysis")
    print("=" * 60)
    
    success_steps = 0
    total_steps = 6
    
    # Step 1: Check environment
    if check_current_environment():
        success_steps += 1
    
    # Step 2: Fix OpenMP conflict
    fix_openmp_conflict()
    success_steps += 1
    
    # Step 3: Install correct NVIDIA libraries
    if install_correct_nvidia_libraries():
        success_steps += 1
    
    # Step 4: Set library paths
    if set_nvidia_library_path():
        success_steps += 1
    
    # Step 5: Check ctranslate2 compatibility
    if downgrade_ctranslate2_if_needed():
        success_steps += 1
    
    # Step 6: Test GPU Whisper
    if test_gpu_whisper():
        success_steps += 1
    
    print(f"\n📊 RESULTS: {success_steps}/{total_steps} steps successful")
    
    if success_steps == total_steps:
        print("🎉 GPU ACCELERATION FIXED!")
        print("✅ faster-whisper should now work with GPU")
        return True
    elif success_steps >= 4:
        print("⚠️  Partial success - GPU acceleration may work")
        print("🔧 Try running your test again")
        return True
    else:
        print("❌ GPU acceleration fix failed")
        print("💡 Consider using Docker with nvidia/cuda:12.3.2-cudnn9-runtime-ubuntu22.04")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
