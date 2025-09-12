#!/usr/bin/env python3
"""
Focused GPU Performance Test on Larger Audio Files
Testing RTX 3060 with the biggest Common Voice files
"""

import os
import sys
import time
import torch
import statistics
from pathlib import Path
from faster_whisper import WhisperModel

# Set environment variables for OpenMP compatibility
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

def test_large_files():
    """Test GPU performance on larger audio files"""
    print("🚀 RTX 3060 LARGE FILE PERFORMANCE TEST")
    print("=" * 60)
    
    # Get all audio files sorted by size (largest first)
    audio_dir = Path("tests/audio_samples")
    audio_files = list(audio_dir.glob("*.mp3"))
    audio_files.sort(key=lambda f: f.stat().st_size, reverse=True)
    
    print(f"📁 Found {len(audio_files)} audio files")
    print("🔍 Testing largest files first:")
    
    for i, file in enumerate(audio_files[:10]):
        size_kb = file.stat().st_size / 1024
        print(f"   {i+1:2d}. {file.name} ({size_kb:.1f} KB)")
    
    # Load GPU model
    print(f"\n📥 Loading Whisper model on GPU...")
    start_load = time.time()
    
    model = WhisperModel(
        "tiny",
        device="cuda",
        compute_type="float16",
        cpu_threads=0
    )
    
    load_time = time.time() - start_load
    print(f"✅ Model loaded in {load_time:.2f}s")
    
    # Test all files
    results = []
    total_audio_duration = 0
    total_processing_time = 0
    
    print(f"\n🎤 PROCESSING ALL {len(audio_files)} FILES:")
    print("=" * 60)
    
    for i, audio_file in enumerate(audio_files):
        size_kb = audio_file.stat().st_size / 1024
        print(f"\n📄 File {i+1}/{len(audio_files)}: {audio_file.name} ({size_kb:.1f} KB)")
        
        # Transcribe
        start_time = time.time()
        segments, info = model.transcribe(
            str(audio_file),
            beam_size=1,
            best_of=1
        )
        
        # Force evaluation of segments
        transcript_segments = list(segments)
        processing_time = time.time() - start_time
        
        # Calculate metrics
        duration = info.duration
        speed_ratio = duration / processing_time if processing_time > 0 else 0
        
        result = {
            'file': audio_file.name,
            'size_kb': size_kb,
            'duration': duration,
            'processing_time': processing_time,
            'speed_ratio': speed_ratio,
            'language': info.language,
            'language_prob': info.language_probability,
            'segments': len(transcript_segments),
            'text_preview': transcript_segments[0].text[:80] if transcript_segments else "No text"
        }
        
        results.append(result)
        total_audio_duration += duration
        total_processing_time += processing_time
        
        print(f"   ⏱️  Duration: {duration:.1f}s | Processing: {processing_time:.2f}s | Speed: {speed_ratio:.1f}x")
        print(f"   🌍 Language: {info.language} ({info.language_probability:.2f})")
        print(f"   📝 Text: {result['text_preview']}...")
        
        # Clean GPU memory
        torch.cuda.empty_cache()
    
    # Calculate comprehensive statistics
    print(f"\n📊 COMPREHENSIVE GPU PERFORMANCE RESULTS")
    print("=" * 60)
    
    speed_ratios = [r['speed_ratio'] for r in results]
    processing_times = [r['processing_time'] for r in results]
    file_sizes = [r['size_kb'] for r in results]
    durations = [r['duration'] for r in results]
    
    overall_speed = total_audio_duration / total_processing_time
    
    print(f"🎯 PROCESSING SPEED STATISTICS:")
    print(f"   Overall Speed: {overall_speed:.1f}x real-time")
    print(f"   Average Speed: {statistics.mean(speed_ratios):.1f}x real-time")
    print(f"   Fastest File: {max(speed_ratios):.1f}x real-time")
    print(f"   Slowest File: {min(speed_ratios):.1f}x real-time")
    print(f"   Speed Std Dev: {statistics.stdev(speed_ratios):.1f}x")
    
    print(f"\n📏 FILE SIZE vs PERFORMANCE:")
    print(f"   Smallest File: {min(file_sizes):.1f} KB")
    print(f"   Largest File: {max(file_sizes):.1f} KB")
    print(f"   Avg File Size: {statistics.mean(file_sizes):.1f} KB")
    
    print(f"\n⏰ TIME EFFICIENCY:")
    print(f"   Total Audio: {total_audio_duration:.1f}s ({total_audio_duration/60:.1f} minutes)")
    print(f"   Total Processing: {total_processing_time:.1f}s ({total_processing_time/60:.1f} minutes)")
    print(f"   Time Saved: {total_audio_duration - total_processing_time:.1f}s")
    print(f"   Efficiency: {((total_audio_duration - total_processing_time) / total_audio_duration * 100):.1f}% time saved")
    
    print(f"\n🏆 TOP PERFORMERS (Speed):")
    sorted_by_speed = sorted(results, key=lambda x: x['speed_ratio'], reverse=True)
    for i, result in enumerate(sorted_by_speed[:5]):
        print(f"   {i+1}. {result['file']} - {result['speed_ratio']:.1f}x ({result['size_kb']:.1f} KB)")
    
    print(f"\n📈 PERFORMANCE BY FILE SIZE:")
    # Group by size ranges
    small_files = [r for r in results if r['size_kb'] < 25]
    medium_files = [r for r in results if 25 <= r['size_kb'] < 35]
    large_files = [r for r in results if r['size_kb'] >= 35]
    
    if small_files:
        avg_speed_small = statistics.mean([r['speed_ratio'] for r in small_files])
        print(f"   Small files (<25KB): {len(small_files)} files, avg {avg_speed_small:.1f}x speed")
    
    if medium_files:
        avg_speed_medium = statistics.mean([r['speed_ratio'] for r in medium_files])
        print(f"   Medium files (25-35KB): {len(medium_files)} files, avg {avg_speed_medium:.1f}x speed")
    
    if large_files:
        avg_speed_large = statistics.mean([r['speed_ratio'] for r in large_files])
        print(f"   Large files (>35KB): {len(large_files)} files, avg {avg_speed_large:.1f}x speed")
    
    # Language detection accuracy
    language_accuracy = len([r for r in results if r['language_prob'] > 0.8]) / len(results) * 100
    print(f"\n🌍 LANGUAGE DETECTION:")
    print(f"   High confidence (>80%): {language_accuracy:.1f}% of files")
    
    # Memory usage
    gpu_memory = torch.cuda.max_memory_allocated() / (1024**3)
    print(f"\n💾 GPU MEMORY USAGE:")
    print(f"   Peak GPU Memory: {gpu_memory:.2f} GB")
    
    # Final verdict
    print(f"\n🎉 RTX 3060 PERFORMANCE VERDICT:")
    if overall_speed > 15:
        print(f"   🚀 EXCEPTIONAL: {overall_speed:.1f}x real-time processing")
    elif overall_speed > 10:
        print(f"   ✅ EXCELLENT: {overall_speed:.1f}x real-time processing")
    elif overall_speed > 5:
        print(f"   👍 GOOD: {overall_speed:.1f}x real-time processing")
    else:
        print(f"   ⚠️  MODERATE: {overall_speed:.1f}x real-time processing")
    
    print(f"   💡 GPU can process {total_audio_duration/60:.1f} minutes of audio in {total_processing_time/60:.1f} minutes")
    print(f"   🎯 Perfect for real-time transcription and batch processing!")
    
    # Cleanup
    del model
    torch.cuda.empty_cache()
    
    return results

def main():
    """Run the large file test"""
    if not torch.cuda.is_available():
        print("❌ CUDA not available")
        return
    
    results = test_large_files()
    print(f"\n{'='*60}")
    print("✅ RTX 3060 GPU ACCELERATION TESTING COMPLETE!")

if __name__ == "__main__":
    main()
