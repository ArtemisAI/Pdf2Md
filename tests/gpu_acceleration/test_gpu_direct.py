import torch
from faster_whisper import WhisperModel
import os

def test_gpu_directly():
    print("🔥 TESTING GPU ACCELERATION DIRECTLY")
    print("=" * 50)
    
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"PyTorch version: {torch.__version__}")
    
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"CUDA version: {torch.version.cuda}")
        
        # Test basic GPU operations first
        print("\nTesting basic GPU tensor operations...")
        x = torch.randn(100, 100).cuda()
        y = torch.randn(100, 100).cuda()
        z = torch.matmul(x, y)
        print(f"✅ Basic GPU operations working")
        
        # Clear memory
        del x, y, z
        torch.cuda.empty_cache()
        
        # Now test Whisper model
        print("\n🎤 Testing Whisper model on GPU...")
        try:
            model = WhisperModel("tiny", device="cuda", compute_type="float16")
            print("✅ Whisper model loaded on GPU successfully!")
            
            # Test with our audio file
            audio_file = "tests/test_audio.wav"
            if os.path.exists(audio_file):
                print(f"🎵 Testing transcription with {audio_file}")
                segments, info = model.transcribe(audio_file)
                
                transcription = ""
                for segment in segments:
                    transcription += segment.text + " "
                
                print(f"✅ GPU Transcription successful!")
                print(f"Language: {info.language}")
                print(f"Duration: {info.duration:.2f}s")
                print(f"Transcription: '{transcription.strip()}'")
                
                # GPU memory usage
                memory_used = torch.cuda.memory_allocated(0) / 1024**2
                print(f"GPU memory used: {memory_used:.1f} MB")
                
                return True
            else:
                print(f"⚠️ Audio file not found: {audio_file}")
                return False
                
        except Exception as e:
            print(f"❌ GPU Whisper failed: {e}")
            print(f"Error type: {type(e)}")
            return False
    else:
        print("❌ CUDA not available")
        return False

if __name__ == "__main__":
    success = test_gpu_directly()
    print(f"\n🎯 GPU Test Result: {'✅ SUCCESS' if success else '❌ FAILED'}")
