#!/usr/bin/env python3
"""
Test GPU audio transcription with real file
"""

import os
import sys
import time
from pathlib import Path

# Set environment variables for OpenMP compatibility
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

def test_audio_transcription(audio_path):
    """Test audio transcription with GPU acceleration"""
    try:
        print(f"🎤 Testing audio transcription...")
        print(f"📁 File: {audio_path}")
        
        from faster_whisper import WhisperModel
        
        # Load model with GPU acceleration
        print("Loading tiny model on GPU...")
        start_time = time.time()
        model = WhisperModel("tiny", device="cuda", compute_type="float16")
        load_time = time.time() - start_time
        print(f"✅ Model loaded in {load_time:.2f}s")
        
        # Check file size
        file_size = os.path.getsize(audio_path) / 1024  # KB
        print(f"📊 File size: {file_size:.1f} KB")
        
        # Transcribe audio
        print("🔄 Starting transcription...")
        start_time = time.time()
        segments, info = model.transcribe(
            audio_path, 
            language="en",
            beam_size=1,  # Faster processing for testing
            best_of=1
        )
        
        # Collect results
        transcription = ""
        for segment in segments:
            transcription += segment.text + " "
        
        transcription_time = time.time() - start_time
        
        print(f"✅ Transcription completed in {transcription_time:.2f}s")
        print(f"🎯 Detected language: {info.language} (confidence: {info.language_probability:.1%})")
        
        if transcription.strip():
            print(f"📝 Transcription: {transcription.strip()}")
        else:
            print("⚠️ No transcription generated (empty result)")
        
        # Performance metrics
        try:
            import librosa
            y, sr = librosa.load(audio_path)
            duration = librosa.get_duration(y=y, sr=sr)
            speed_factor = duration / transcription_time
            print(f"⚡ Processing speed: {speed_factor:.1f}x real-time")
        except:
            print("📊 Could not calculate processing speed (librosa not available)")
        
        del model
        return True
        
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        return False

def main():
    print("🚀 GPU AUDIO TRANSCRIPTION TEST")
    print("=" * 50)
    
    # Find a test audio file
    test_file = Path("tests/audio_samples/github_friendly/test_002_duration_21kb.mp3")
    
    if test_file.exists():
        print(f"✅ Found test file: {test_file}")
        return test_audio_transcription(str(test_file))
    else:
        print("❌ Test file not found")
        # Try another path
        for pattern in ["tests/**/*.mp3", "tests/**/*.wav", "tests/**/*.m4a"]:
            for file in Path(".").glob(pattern):
                print(f"📁 Found audio file: {file}")
                return test_audio_transcription(str(file))
        
        print("❌ No audio files found for testing")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)