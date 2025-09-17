#!/usr/bin/env python3
"""
Test GPU audio transcription with larger files
"""

import os
import sys
import time
from pathlib import Path

# Set environment variables for OpenMP compatibility
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

def test_large_audio_transcription(audio_path):
    """Test audio transcription with GPU acceleration on larger files"""
    try:
        print(f"🎤 Testing large audio transcription...")
        print(f"📁 File: {audio_path}")
        
        from faster_whisper import WhisperModel
        
        # Load model with GPU acceleration
        print("Loading tiny model on GPU for fast processing...")
        start_time = time.time()
        model = WhisperModel("tiny", device="cuda", compute_type="float16")
        load_time = time.time() - start_time
        print(f"✅ Model loaded in {load_time:.2f}s")
        
        # Check file size
        file_size = os.path.getsize(audio_path) / 1024 / 1024  # MB
        print(f"📊 File size: {file_size:.2f} MB")
        
        # Transcribe audio with performance monitoring
        print("🔄 Starting transcription...")
        start_time = time.time()
        segments, info = model.transcribe(
            audio_path, 
            language="en",
            beam_size=1,  # Faster processing
            best_of=1,
            vad_filter=True,  # Voice activity detection for efficiency
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        # Collect results efficiently
        transcription_parts = []
        segment_count = 0
        for segment in segments:
            transcription_parts.append(segment.text)
            segment_count += 1
            if segment_count <= 3:  # Show first 3 segments as preview
                print(f"  📝 Segment {segment_count}: {segment.text}")
        
        transcription_time = time.time() - start_time
        full_transcription = " ".join(transcription_parts)
        
        print(f"✅ Transcription completed in {transcription_time:.2f}s")
        print(f"🎯 Detected language: {info.language} (confidence: {info.language_probability:.1%})")
        print(f"📊 Total segments: {segment_count}")
        print(f"📊 Text length: {len(full_transcription)} characters")
        
        # Performance metrics
        try:
            import librosa
            y, sr = librosa.load(audio_path)
            duration = librosa.get_duration(y=y, sr=sr)
            speed_factor = duration / transcription_time
            print(f"⚡ Audio duration: {duration:.1f}s")
            print(f"⚡ Processing speed: {speed_factor:.1f}x real-time")
            
            if speed_factor > 10:
                print("🚀 EXCELLENT: >10x real-time processing achieved!")
            elif speed_factor > 5:
                print("🎯 GOOD: >5x real-time processing achieved!")
            else:
                print("📈 Processing completed successfully")
                
        except Exception as e:
            print(f"📊 Could not calculate audio duration: {e}")
        
        # Show transcription preview
        if full_transcription.strip():
            preview = full_transcription[:200] + "..." if len(full_transcription) > 200 else full_transcription
            print(f"📖 Transcription preview: {preview}")
        else:
            print("⚠️ No transcription generated (empty result)")
        
        del model
        return True
        
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("🚀 LARGE FILE GPU AUDIO TRANSCRIPTION TEST")
    print("=" * 60)
    
    # Test with MP3 file first (usually easier to process)
    test_file = Path("tests/Audio_Long/20250911_160742_1.mp3")
    
    if test_file.exists():
        print(f"✅ Found test file: {test_file}")
        return test_large_audio_transcription(str(test_file))
    else:
        print("❌ Primary test file not found, trying alternatives...")
        
        # Try other files
        audio_dir = Path("tests/Audio_Long")
        if audio_dir.exists():
            for pattern in ["*.mp3", "*.mp4", "*.wav"]:
                for file in audio_dir.glob(pattern):
                    print(f"📁 Found audio file: {file}")
                    return test_large_audio_transcription(str(file))
        
        print("❌ No audio files found for testing")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)