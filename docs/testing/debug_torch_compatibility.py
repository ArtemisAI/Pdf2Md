#!/usr/bin/env python3
"""
Detailed debugging of PyTorch and transformers compatibility
"""

import sys
import torch

print("🔍 DEBUGGING PYTORCH COMPATIBILITY")
print("=" * 50)

print(f"Python version: {sys.version}")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")

# Check torch.utils module
print("\n📦 Checking torch.utils module...")
try:
    import torch.utils
    print(f"✓ torch.utils imported")
    
    # Check _pytree module
    try:
        import torch.utils._pytree
        print(f"✓ torch.utils._pytree imported")
        
        # Check available attributes
        attrs = dir(torch.utils._pytree)
        print(f"Available attributes: {len(attrs)}")
        
        if 'register_pytree_node' in attrs:
            print("✓ register_pytree_node found")
        else:
            print("❌ register_pytree_node missing")
            print("Available _pytree attrs:", [a for a in attrs if not a.startswith('_')])
            
    except ImportError as e:
        print(f"❌ torch.utils._pytree import failed: {e}")
        
except ImportError as e:
    print(f"❌ torch.utils import failed: {e}")

# Try importing transformers step by step
print("\n📦 Testing transformers import...")
try:
    print("Importing transformers...")
    import transformers
    print(f"✓ Transformers version: {transformers.__version__}")
except Exception as e:
    print(f"❌ Transformers import failed: {e}")
    print(f"Error type: {type(e)}")

# Try importing faster_whisper step by step
print("\n📦 Testing faster_whisper import...")
try:
    print("Importing faster_whisper...")
    import faster_whisper
    print(f"✓ Faster Whisper imported")
except Exception as e:
    print(f"❌ Faster Whisper import failed: {e}")
    print(f"Error type: {type(e)}")

# Check if there's a version mismatch
print("\n🔧 Checking for known compatibility issues...")
torch_version = torch.__version__
if "+cu" in torch_version:
    print(f"Using CUDA PyTorch: {torch_version}")
    print("This may require specific transformers version compatibility")

print("\nFinished debugging.")
