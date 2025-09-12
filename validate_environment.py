#!/usr/bin/env python3
"""
Complete Environment Validation Script for Pdf2Md MCP Server
Tests all critical components for GitHub Copilot and GPU acceleration
"""

import sys
import importlib.util
import subprocess
import platform

def test_component(name, test_func):
    """Test a component and report results"""
    print(f"🧪 Testing {name}...")
    try:
        result = test_func()
        if result:
            print(f"✅ {name}: PASS")
            return True
        else:
            print(f"❌ {name}: FAIL")
            return False
    except Exception as e:
        print(f"❌ {name}: ERROR - {e}")
        return False

def test_python_version():
    """Test Python version compatibility"""
    version = sys.version_info
    return version.major == 3 and version.minor >= 11

def test_torch_import():
    """Test PyTorch import"""
    try:
        import torch
        return True
    except ImportError:
        return False

def test_cuda_availability():
    """Test CUDA availability"""
    try:
        import torch
        return torch.cuda.is_available()
    except:
        return False

def test_faster_whisper():
    """Test faster-whisper import"""
    try:
        from faster_whisper import WhisperModel
        return True
    except ImportError:
        return False

def test_gpu_model_loading():
    """Test GPU model loading"""
    try:
        import torch
        if not torch.cuda.is_available():
            return False
        from faster_whisper import WhisperModel
        model = WhisperModel('tiny', device='cuda')
        return True
    except:
        return False

def test_cpu_model_loading():
    """Test CPU model loading as fallback"""
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel('tiny', device='cpu')
        return True
    except:
        return False

def test_gpu_libraries():
    """Test GPU-specific libraries"""
    try:
        import pynvml  # nvidia-ml-py package provides pynvml module
        import GPUtil
        return True
    except ImportError:
        return False

def test_audio_libraries():
    """Test audio processing libraries"""
    try:
        import transformers
        import accelerate
        return True
    except ImportError:
        return False

def test_uv_installation():
    """Test UV package manager"""
    try:
        result = subprocess.run(['uv', '--version'], capture_output=True, text=True)
        return result.returncode == 0
    except FileNotFoundError:
        return False

def get_system_info():
    """Get system information"""
    info = {
        'Platform': platform.system(),
        'Python Version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        'Architecture': platform.machine(),
    }
    
    try:
        import torch
        info['PyTorch Version'] = torch.__version__
        info['CUDA Available'] = torch.cuda.is_available()
        if torch.cuda.is_available():
            info['CUDA Device'] = torch.cuda.get_device_name(0)
            info['CUDA Memory'] = f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB"
    except:
        info['PyTorch'] = 'Not installed'
    
    try:
        result = subprocess.run(['uv', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            info['UV Version'] = result.stdout.strip()
    except:
        info['UV'] = 'Not installed'
    
    return info

def main():
    """Main validation function"""
    print("🚀 Pdf2Md MCP Server - Environment Validation")
    print("=" * 60)
    
    # System Information
    print("\n📋 System Information:")
    info = get_system_info()
    for key, value in info.items():
        print(f"   {key}: {value}")
    
    print("\n🧪 Component Tests:")
    print("-" * 40)
    
    tests = [
        ("Python 3.11+", test_python_version),
        ("UV Package Manager", test_uv_installation),
        ("PyTorch Import", test_torch_import),
        ("CUDA Availability", test_cuda_availability),
        ("faster-whisper Import", test_faster_whisper),
        ("GPU Model Loading", test_gpu_model_loading),
        ("CPU Model Loading (Fallback)", test_cpu_model_loading),
        ("GPU Libraries", test_gpu_libraries),
        ("Audio Libraries", test_audio_libraries),
    ]
    
    results = []
    for name, test_func in tests:
        results.append(test_component(name, test_func))
    
    # Summary
    print("\n📊 Test Summary:")
    print("-" * 40)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ ALL TESTS PASSED ({passed}/{total})")
        print("🎉 Environment is ready for GitHub Copilot & GPU acceleration!")
        
        # Performance prediction
        try:
            import torch
            if torch.cuda.is_available():
                print(f"⚡ Expected Performance: ~19.4x real-time on {torch.cuda.get_device_name(0)}")
            else:
                print("💻 CPU Mode: ~2-3x real-time processing")
        except:
            pass
            
    else:
        print(f"⚠️  SOME TESTS FAILED ({passed}/{total})")
        print("🔧 Please check the setup instructions and fix failing components")
        
        # Provide specific guidance
        if not results[tests.index(("CUDA Availability", test_cuda_availability))]:
            print("💡 GPU not available - CPU fallback will be used")
        if not results[tests.index(("UV Package Manager", test_uv_installation))]:
            print("💡 Install UV: curl -LsSf https://astral.sh/uv/install.sh | sh")
    
    print("\n📚 Documentation: .github/SETUP_INSTRUCTIONS.md")
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
