#!/usr/bin/env python3
"""
Incremental GPU Testing with Real Common Voice Audio
Test real speech audio with CPU first, then GPU acceleration
"""

import os
import sys
import json
import time
import torch
from pathlib import Path
from faster_whisper import WhisperModel

class IncrementalGPUTester:
    def __init__(self, test_dir="tests/cv_sample"):
        self.test_dir = Path(test_dir)
        self.manifest_path = self.test_dir / "test_manifest.json"
        self.results = {
            'test_session': time.strftime('%Y-%m-%d %H:%M:%S'),
            'system_info': self.get_system_info(),
            'phase_results': []
        }
        
    def get_system_info(self):
        """Get system information for testing context"""
        info = {
            'cuda_available': torch.cuda.is_available(),
            'python_version': sys.version,
            'torch_version': torch.__version__
        }
        
        if torch.cuda.is_available():
            info.update({
                'gpu_name': torch.cuda.get_device_name(0),
                'gpu_memory_gb': torch.cuda.get_device_properties(0).total_memory / 1024**3,
                'cuda_version': torch.version.cuda
            })
        
        return info
    
    def load_test_manifest(self):
        """Load the test manifest created by the sampler"""
        if not self.manifest_path.exists():
            print(f"❌ Test manifest not found: {self.manifest_path}")
            return None
            
        with open(self.manifest_path, 'r') as f:
            return json.load(f)
    
    def test_single_file(self, file_path, device="cpu", model_size="tiny"):
        """Test transcription of a single file"""
        if not os.path.exists(file_path):
            return {'error': f'File not found: {file_path}'}
        
        try:
            compute_type = "float16" if device == "cuda" else "int8"
            
            # Load model
            load_start = time.time()
            model = WhisperModel(model_size, device=device, compute_type=compute_type)
            load_time = time.time() - load_start
            
            # Transcribe
            transcribe_start = time.time()
            segments, info = model.transcribe(file_path, language="en")
            
            # Collect segments
            transcription_text = ""
            segment_count = 0
            for segment in segments:
                transcription_text += segment.text + " "
                segment_count += 1
            
            transcribe_time = time.time() - transcribe_start
            
            # GPU memory info
            gpu_memory = 0
            if device == "cuda" and torch.cuda.is_available():
                gpu_memory = torch.cuda.memory_allocated(0) / 1024**2
            
            result = {
                'success': True,
                'device': device,
                'model_size': model_size,
                'load_time': load_time,
                'transcribe_time': transcribe_time,
                'total_time': load_time + transcribe_time,
                'segment_count': segment_count,
                'text_length': len(transcription_text.strip()),
                'transcription': transcription_text.strip(),
                'language_detected': info.language,
                'audio_duration': info.duration,
                'gpu_memory_mb': gpu_memory,
                'real_time_factor': info.duration / transcribe_time if transcribe_time > 0 else 0
            }
            
            # Clean up
            del model
            if device == "cuda":
                torch.cuda.empty_cache()
            
            return result
            
        except Exception as e:
            return {'error': str(e), 'device': device}
    
    def run_phase_1_cpu_baseline(self, test_files):
        """Phase 1: Establish CPU baseline with small files"""
        print("\n🧪 PHASE 1: CPU BASELINE TESTING")
        print("=" * 50)
        
        phase_results = {
            'phase': 'CPU Baseline',
            'files_tested': [],
            'summary': {}
        }
        
        cpu_times = []
        successful_tests = 0
        
        # Test first 5 files on CPU
        test_phase_files = test_files[:5]
        
        for i, file_info in enumerate(test_phase_files):
            file_path = file_info['path']
            filename = file_info['filename']
            
            print(f"\n📝 [{i+1}/5] Testing: {filename}")
            print(f"   📏 Size: {file_info['size_bytes']/1024:.1f} KB")
            
            result = self.test_single_file(file_path, device="cpu")
            
            if result.get('success'):
                print(f"   ✅ CPU Time: {result['transcribe_time']:.2f}s")
                print(f"   🎵 Duration: {result['audio_duration']:.2f}s")
                print(f"   ⚡ Real-time factor: {result['real_time_factor']:.2f}x")
                print(f"   📝 Text: {result['transcription'][:50]}...")
                
                cpu_times.append(result['transcribe_time'])
                successful_tests += 1
            else:
                print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
            
            phase_results['files_tested'].append({
                'filename': filename,
                'result': result
            })
        
        # Calculate summary
        if cpu_times:
            phase_results['summary'] = {
                'successful_tests': successful_tests,
                'average_cpu_time': sum(cpu_times) / len(cpu_times),
                'min_cpu_time': min(cpu_times),
                'max_cpu_time': max(cpu_times),
                'total_cpu_time': sum(cpu_times)
            }
            
            print(f"\n📊 CPU BASELINE SUMMARY:")
            print(f"   ✅ Successful: {successful_tests}/5 tests")
            print(f"   ⏱️  Average time: {phase_results['summary']['average_cpu_time']:.2f}s")
            print(f"   📈 Range: {phase_results['summary']['min_cpu_time']:.2f}s - {phase_results['summary']['max_cpu_time']:.2f}s")
        
        return phase_results
    
    def run_phase_2_gpu_comparison(self, test_files, cpu_baseline):
        """Phase 2: GPU testing with same files for comparison"""
        print("\n🧪 PHASE 2: GPU ACCELERATION TESTING")
        print("=" * 50)
        
        if not torch.cuda.is_available():
            print("❌ CUDA not available, skipping GPU testing")
            return {'phase': 'GPU Testing', 'error': 'CUDA not available'}
        
        phase_results = {
            'phase': 'GPU Acceleration',
            'files_tested': [],
            'summary': {},
            'comparison_with_cpu': {}
        }
        
        gpu_times = []
        successful_tests = 0
        
        # Test same files as CPU baseline
        test_phase_files = test_files[:5]
        
        for i, file_info in enumerate(test_phase_files):
            file_path = file_info['path']
            filename = file_info['filename']
            
            print(f"\n🔥 [{i+1}/5] GPU Testing: {filename}")
            
            # Try GPU transcription
            result = self.test_single_file(file_path, device="cuda")
            
            if result.get('success'):
                print(f"   ✅ GPU Time: {result['transcribe_time']:.2f}s")
                print(f"   💾 GPU Memory: {result['gpu_memory_mb']:.1f} MB")
                print(f"   ⚡ Real-time factor: {result['real_time_factor']:.2f}x")
                
                # Compare with CPU if available
                cpu_result = None
                if cpu_baseline and i < len(cpu_baseline['files_tested']):
                    cpu_file_result = cpu_baseline['files_tested'][i]['result']
                    if cpu_file_result.get('success'):
                        cpu_time = cpu_file_result['transcribe_time']
                        gpu_time = result['transcribe_time']
                        speedup = cpu_time / gpu_time if gpu_time > 0 else 0
                        
                        print(f"   🚀 Speedup: {speedup:.2f}x faster than CPU")
                        result['cpu_comparison'] = {
                            'cpu_time': cpu_time,
                            'gpu_time': gpu_time,
                            'speedup': speedup
                        }
                
                gpu_times.append(result['transcribe_time'])
                successful_tests += 1
            else:
                print(f"   ❌ GPU Failed: {result.get('error', 'Unknown error')}")
                
                # Try CPU fallback
                print(f"   🔄 Trying CPU fallback...")
                cpu_fallback = self.test_single_file(file_path, device="cpu")
                if cpu_fallback.get('success'):
                    print(f"   ✅ CPU Fallback: {cpu_fallback['transcribe_time']:.2f}s")
                    result['cpu_fallback'] = cpu_fallback
            
            phase_results['files_tested'].append({
                'filename': filename,
                'result': result
            })
        
        # Calculate summary
        if gpu_times:
            phase_results['summary'] = {
                'successful_tests': successful_tests,
                'average_gpu_time': sum(gpu_times) / len(gpu_times),
                'min_gpu_time': min(gpu_times),
                'max_gpu_time': max(gpu_times),
                'total_gpu_time': sum(gpu_times)
            }
            
            # Compare with CPU baseline
            if cpu_baseline and 'summary' in cpu_baseline:
                cpu_avg = cpu_baseline['summary']['average_cpu_time']
                gpu_avg = phase_results['summary']['average_gpu_time']
                overall_speedup = cpu_avg / gpu_avg if gpu_avg > 0 else 0
                
                phase_results['comparison_with_cpu'] = {
                    'overall_speedup': overall_speedup,
                    'cpu_average': cpu_avg,
                    'gpu_average': gpu_avg
                }
                
                print(f"\n🚀 GPU ACCELERATION SUMMARY:")
                print(f"   ✅ Successful: {successful_tests}/5 tests")
                print(f"   ⏱️  Average GPU time: {gpu_avg:.2f}s")
                print(f"   🚀 Overall speedup: {overall_speedup:.2f}x")
                
                if overall_speedup > 1.5:
                    print(f"   🎉 Excellent GPU acceleration achieved!")
                elif overall_speedup > 1.1:
                    print(f"   ✅ Good GPU acceleration achieved!")
                else:
                    print(f"   ⚠️  Limited GPU acceleration (files may be too small)")
        
        return phase_results
    
    def run_phase_3_larger_files(self, test_files):
        """Phase 3: Test larger files where GPU should show more benefit"""
        print("\n🧪 PHASE 3: LARGER FILES PERFORMANCE ANALYSIS")
        print("=" * 50)
        
        phase_results = {
            'phase': 'Larger Files Analysis',
            'files_tested': [],
            'summary': {}
        }
        
        # Test larger files (files 10-15)
        larger_files = test_files[10:] if len(test_files) > 10 else test_files[5:]
        
        if not larger_files:
            print("⚠️  No larger files available for testing")
            return phase_results
        
        print(f"📏 Testing {len(larger_files)} larger files...")
        
        for device in ['cpu', 'cuda'] if torch.cuda.is_available() else ['cpu']:
            device_times = []
            print(f"\n🔧 Testing with {device.upper()}...")
            
            for i, file_info in enumerate(larger_files):
                filename = file_info['filename']
                file_path = file_info['path']
                
                print(f"   📝 [{i+1}/{len(larger_files)}] {filename}")
                
                result = self.test_single_file(file_path, device=device)
                
                if result.get('success'):
                    print(f"      ⏱️  Time: {result['transcribe_time']:.2f}s")
                    print(f"      ⚡ RTF: {result['real_time_factor']:.2f}x")
                    device_times.append(result['transcribe_time'])
                    
                    if device == 'cuda':
                        print(f"      💾 GPU Memory: {result['gpu_memory_mb']:.1f} MB")
                else:
                    print(f"      ❌ Failed: {result.get('error', 'Unknown')}")
                
                # Store result
                if device == 'cpu':
                    phase_results['files_tested'].append({
                        'filename': filename,
                        'cpu_result': result
                    })
                else:
                    # Find existing entry and add GPU result
                    for entry in phase_results['files_tested']:
                        if entry['filename'] == filename:
                            entry['gpu_result'] = result
                            break
            
            if device_times:
                avg_time = sum(device_times) / len(device_times)
                print(f"   📊 {device.upper()} Average: {avg_time:.2f}s")
        
        return phase_results
    
    def save_results(self):
        """Save all test results to file"""
        results_path = self.test_dir / f"gpu_test_results_{int(time.time())}.json"
        
        with open(results_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📋 Results saved: {results_path}")
        return results_path

def main():
    """Main testing execution"""
    print("🚀 INCREMENTAL GPU TESTING WITH REAL AUDIO")
    print("=" * 60)
    
    tester = IncrementalGPUTester()
    
    # Load test manifest
    manifest = tester.load_test_manifest()
    if not manifest:
        print("❌ Cannot proceed without test manifest")
        return False
    
    test_files = manifest['test_files']
    print(f"📦 Loaded {len(test_files)} test files")
    
    # Phase 1: CPU Baseline
    cpu_results = tester.run_phase_1_cpu_baseline(test_files)
    tester.results['phase_results'].append(cpu_results)
    
    # Phase 2: GPU Comparison
    gpu_results = tester.run_phase_2_gpu_comparison(test_files, cpu_results)
    tester.results['phase_results'].append(gpu_results)
    
    # Phase 3: Larger Files
    larger_results = tester.run_phase_3_larger_files(test_files)
    tester.results['phase_results'].append(larger_results)
    
    # Save results
    results_path = tester.save_results()
    
    print("\n🎯 TESTING COMPLETE!")
    print(f"📄 Full results: {results_path}")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
