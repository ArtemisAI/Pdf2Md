#!/usr/bin/env python3
"""
Comprehensive GPU vs CPU Benchmark for faster-whisper
Testing RTX 3060 performance on Common Voice dataset
"""

import os
import sys
import time
import torch
import json
import statistics
from pathlib import Path
from faster_whisper import WhisperModel
import psutil
try:
    import GPUtil
    GPUTIL_AVAILABLE = True
except ImportError:
    GPUTIL_AVAILABLE = False

# Set environment variables for OpenMP compatibility
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

class AudioBenchmark:
    def __init__(self):
        self.results = {
            'system_info': self.get_system_info(),
            'gpu_results': [],
            'cpu_results': [],
            'summary': {}
        }
        
    def get_system_info(self):
        """Collect system information"""
        info = {
            'cpu': f"{psutil.cpu_count()} cores ({psutil.cpu_count(logical=False)} physical)",
            'ram': f"{psutil.virtual_memory().total / (1024**3):.1f} GB",
            'python': sys.version.split()[0],
            'pytorch': torch.__version__,
        }
        
        if torch.cuda.is_available():
            info['gpu'] = torch.cuda.get_device_name(0)
            info['gpu_memory'] = f"{torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f} GB"
            info['cuda_version'] = torch.version.cuda
        else:
            info['gpu'] = "Not available"
            
        return info
    
    def get_audio_files(self):
        """Get audio files sorted by size"""
        audio_dir = Path("tests/audio_samples")
        if not audio_dir.exists():
            print(f"❌ Audio directory not found: {audio_dir}")
            return []
        
        audio_files = list(audio_dir.glob("*.mp3"))
        if not audio_files:
            print(f"❌ No MP3 files found in {audio_dir}")
            return []
        
        # Sort by file size for progressive testing
        audio_files.sort(key=lambda f: f.stat().st_size)
        
        print(f"📁 Found {len(audio_files)} audio files")
        for i, file in enumerate(audio_files[:5]):  # Show first 5
            size_kb = file.stat().st_size / 1024
            print(f"   {i+1:2d}. {file.name} ({size_kb:.1f} KB)")
        if len(audio_files) > 5:
            print(f"   ... and {len(audio_files) - 5} more files")
        
        return audio_files
    
    def monitor_resources(self):
        """Get current resource usage"""
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        
        gpu_usage = 0
        gpu_memory = 0
        if torch.cuda.is_available() and GPUTIL_AVAILABLE:
            try:
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]
                    gpu_usage = gpu.load * 100
                    gpu_memory = gpu.memoryUsed
            except:
                pass
        
        return {
            'cpu_percent': cpu_percent,
            'ram_used_gb': memory.used / (1024**3),
            'ram_percent': memory.percent,
            'gpu_percent': gpu_usage,
            'gpu_memory_mb': gpu_memory
        }
    
    def test_model_performance(self, device="cuda", compute_type="float16", model_size="tiny"):
        """Test model performance on given device"""
        print(f"\n🧪 TESTING {device.upper()} PERFORMANCE ({model_size} model)")
        print("=" * 60)
        
        try:
            # Load model
            print(f"📥 Loading {model_size} model on {device}...")
            load_start = time.time()
            
            model = WhisperModel(
                model_size,
                device=device,
                compute_type=compute_type if device == "cuda" else "int8",
                cpu_threads=4 if device == "cpu" else 0
            )
            
            load_time = time.time() - load_start
            print(f"✅ Model loaded in {load_time:.2f}s")
            
            # Get audio files
            audio_files = self.get_audio_files()
            if not audio_files:
                return []
            
            # Test on multiple files (start with smaller ones)
            test_files = audio_files[:8]  # Test first 8 files
            results = []
            
            total_duration = 0
            total_processing_time = 0
            
            for i, audio_file in enumerate(test_files):
                print(f"\n📄 Processing file {i+1}/{len(test_files)}: {audio_file.name}")
                
                # Monitor resources before
                resources_before = self.monitor_resources()
                
                # Transcribe
                start_time = time.time()
                segments, info = model.transcribe(
                    str(audio_file),
                    beam_size=1,  # Fast settings for benchmarking
                    best_of=1
                )
                
                # Get transcript (force evaluation)
                transcript_segments = list(segments)
                processing_time = time.time() - start_time
                
                # Monitor resources after
                resources_after = self.monitor_resources()
                
                # Calculate metrics
                duration = info.duration
                speed_ratio = duration / processing_time if processing_time > 0 else 0
                file_size_kb = audio_file.stat().st_size / 1024
                
                result = {
                    'file': audio_file.name,
                    'file_size_kb': file_size_kb,
                    'duration': duration,
                    'processing_time': processing_time,
                    'speed_ratio': speed_ratio,
                    'language': info.language,
                    'language_prob': info.language_probability,
                    'segment_count': len(transcript_segments),
                    'text_length': sum(len(seg.text) for seg in transcript_segments),
                    'resources_before': resources_before,
                    'resources_after': resources_after,
                    'device': device,
                    'model_size': model_size
                }
                
                results.append(result)
                total_duration += duration
                total_processing_time += processing_time
                
                print(f"   Duration: {duration:.1f}s")
                print(f"   Processing: {processing_time:.2f}s")
                print(f"   Speed: {speed_ratio:.1f}x real-time")
                print(f"   Language: {info.language} ({info.language_probability:.2f})")
                print(f"   Text: {transcript_segments[0].text[:60] if transcript_segments else 'No text'}...")
                
                # Memory cleanup for GPU
                if device == "cuda":
                    torch.cuda.empty_cache()
            
            # Calculate summary statistics
            total_speed_ratio = total_duration / total_processing_time if total_processing_time > 0 else 0
            avg_speed_ratio = statistics.mean([r['speed_ratio'] for r in results])
            
            print(f"\n📊 {device.upper()} SUMMARY:")
            print(f"   Files processed: {len(results)}")
            print(f"   Total audio duration: {total_duration:.1f}s")
            print(f"   Total processing time: {total_processing_time:.1f}s")
            print(f"   Overall speed: {total_speed_ratio:.1f}x real-time")
            print(f"   Average speed: {avg_speed_ratio:.1f}x real-time")
            print(f"   Model load time: {load_time:.2f}s")
            
            # Clean up
            del model
            if device == "cuda":
                torch.cuda.empty_cache()
            
            return results
            
        except Exception as e:
            print(f"❌ {device.upper()} test failed: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def run_comprehensive_benchmark(self):
        """Run comprehensive GPU vs CPU benchmark"""
        print("🚀 COMPREHENSIVE GPU vs CPU BENCHMARK")
        print("=" * 70)
        print("Testing faster-whisper performance on Common Voice dataset")
        print("=" * 70)
        
        # Display system info
        print("\n💻 SYSTEM INFORMATION:")
        for key, value in self.results['system_info'].items():
            print(f"   {key}: {value}")
        
        # Test GPU performance
        if torch.cuda.is_available():
            print("\n" + "="*70)
            gpu_results = self.test_model_performance("cuda", "float16", "tiny")
            self.results['gpu_results'] = gpu_results
        else:
            print("\n❌ GPU not available, skipping GPU tests")
        
        # Test CPU performance
        print("\n" + "="*70)
        cpu_results = self.test_model_performance("cpu", "int8", "tiny")
        self.results['cpu_results'] = cpu_results
        
        # Compare results
        self.compare_results()
        
        # Save results
        self.save_results()
    
    def compare_results(self):
        """Compare GPU vs CPU results"""
        print("\n" + "="*70)
        print("📈 PERFORMANCE COMPARISON")
        print("="*70)
        
        gpu_results = self.results['gpu_results']
        cpu_results = self.results['cpu_results']
        
        if not gpu_results or not cpu_results:
            print("❌ Cannot compare - missing results from one or both devices")
            return
        
        # Calculate averages
        gpu_avg_speed = statistics.mean([r['speed_ratio'] for r in gpu_results])
        cpu_avg_speed = statistics.mean([r['speed_ratio'] for r in cpu_results])
        
        gpu_total_time = sum([r['processing_time'] for r in gpu_results])
        cpu_total_time = sum([r['processing_time'] for r in cpu_results])
        
        gpu_total_duration = sum([r['duration'] for r in gpu_results])
        cpu_total_duration = sum([r['duration'] for r in cpu_results])
        
        # Performance comparison
        speed_improvement = gpu_avg_speed / cpu_avg_speed if cpu_avg_speed > 0 else 0
        time_improvement = cpu_total_time / gpu_total_time if gpu_total_time > 0 else 0
        
        print(f"🎯 AVERAGE PROCESSING SPEED:")
        print(f"   GPU (RTX 3060): {gpu_avg_speed:.1f}x real-time")
        print(f"   CPU: {cpu_avg_speed:.1f}x real-time")
        print(f"   GPU Advantage: {speed_improvement:.1f}x faster")
        
        print(f"\n⏱️  TOTAL PROCESSING TIME:")
        print(f"   GPU: {gpu_total_time:.1f}s for {gpu_total_duration:.1f}s audio")
        print(f"   CPU: {cpu_total_time:.1f}s for {cpu_total_duration:.1f}s audio")
        print(f"   Time Savings: {time_improvement:.1f}x faster")
        
        print(f"\n💾 RESOURCE EFFICIENCY:")
        if gpu_results:
            avg_gpu_usage = statistics.mean([r['resources_after']['gpu_percent'] for r in gpu_results if r['resources_after']['gpu_percent'] > 0])
            avg_cpu_usage_gpu = statistics.mean([r['resources_after']['cpu_percent'] for r in gpu_results])
            print(f"   GPU Mode - GPU Usage: {avg_gpu_usage:.1f}%, CPU Usage: {avg_cpu_usage_gpu:.1f}%")
        
        if cpu_results:
            avg_cpu_usage_cpu = statistics.mean([r['resources_after']['cpu_percent'] for r in cpu_results])
            print(f"   CPU Mode - CPU Usage: {avg_cpu_usage_cpu:.1f}%")
        
        # File-by-file comparison
        print(f"\n📁 FILE-BY-FILE COMPARISON:")
        print(f"{'File':<30} {'Size(KB)':<10} {'GPU(x)':<8} {'CPU(x)':<8} {'Improvement':<12}")
        print("-" * 70)
        
        for i in range(min(len(gpu_results), len(cpu_results))):
            gpu_r = gpu_results[i]
            cpu_r = cpu_results[i]
            improvement = gpu_r['speed_ratio'] / cpu_r['speed_ratio'] if cpu_r['speed_ratio'] > 0 else 0
            
            print(f"{gpu_r['file'][:28]:<30} {gpu_r['file_size_kb']:<10.1f} {gpu_r['speed_ratio']:<8.1f} {cpu_r['speed_ratio']:<8.1f} {improvement:<12.1f}x")
        
        # Store summary
        self.results['summary'] = {
            'gpu_avg_speed': gpu_avg_speed,
            'cpu_avg_speed': cpu_avg_speed,
            'speed_improvement': speed_improvement,
            'time_improvement': time_improvement,
            'gpu_total_time': gpu_total_time,
            'cpu_total_time': cpu_total_time,
            'files_tested': len(gpu_results)
        }
        
        # Final verdict
        print(f"\n🏆 BENCHMARK CONCLUSION:")
        if speed_improvement > 1.5:
            print(f"   🚀 GPU provides significant acceleration ({speed_improvement:.1f}x faster)")
        elif speed_improvement > 1.1:
            print(f"   ✅ GPU provides moderate acceleration ({speed_improvement:.1f}x faster)")
        else:
            print(f"   ⚠️  GPU advantage is minimal ({speed_improvement:.1f}x faster)")
        
        print(f"   💡 For {len(gpu_results)} files, GPU saved {cpu_total_time - gpu_total_time:.1f} seconds")
    
    def save_results(self):
        """Save benchmark results to JSON"""
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"benchmark_results_{timestamp}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(self.results, f, indent=2, default=str)
            print(f"\n💾 Results saved to: {filename}")
        except Exception as e:
            print(f"❌ Failed to save results: {e}")

def main():
    """Run the comprehensive benchmark"""
    benchmark = AudioBenchmark()
    benchmark.run_comprehensive_benchmark()
    
    print(f"\n{'='*70}")
    print("🎉 BENCHMARK COMPLETED!")
    print("✅ GPU acceleration testing finished")
    print("📊 Check the JSON file for detailed results")

if __name__ == "__main__":
    main()
