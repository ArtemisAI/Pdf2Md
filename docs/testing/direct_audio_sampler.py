#!/usr/bin/env python3
"""
Direct Audio File Sampling from Common Voice Dataset
Extract representative MP3 files for GPU testing without metadata
"""

import os
import sys
import tarfile
import random
import shutil
import json
import time
from pathlib import Path

class DirectAudioSampler:
    def __init__(self, dataset_path, extract_dir="tests/cv_sample"):
        self.dataset_path = dataset_path
        self.extract_dir = Path(extract_dir)
        self.extract_dir.mkdir(parents=True, exist_ok=True)
        
    def sample_audio_files(self, max_files=15):
        """Sample audio files directly from the archive"""
        print("🎵 SAMPLING AUDIO FILES DIRECTLY")
        print("=" * 50)
        
        try:
            with tarfile.open(self.dataset_path, 'r:gz') as tar:
                # Get all audio files
                audio_members = [m for m in tar.getmembers() 
                               if m.isfile() and m.name.endswith(('.mp3', '.wav', '.ogg'))]
                
                print(f"📦 Total audio files found: {len(audio_members)}")
                
                if len(audio_members) == 0:
                    print("❌ No audio files found in archive")
                    return []
                
                # Smart sampling strategy
                selected_files = self.smart_sample_files(audio_members, max_files)
                
                print(f"🎯 Selected {len(selected_files)} files for testing")
                
                extracted_files = []
                
                for i, member in enumerate(selected_files):
                    print(f"📥 [{i+1}/{len(selected_files)}] Extracting: {os.path.basename(member.name)}")
                    
                    # Extract to temp location
                    tar.extract(member, self.extract_dir)
                    temp_path = self.extract_dir / member.name
                    
                    # Move to simpler structure
                    file_ext = os.path.splitext(member.name)[1]
                    simple_name = f"test_{i+1:03d}_duration_{member.size//1000}kb{file_ext}"
                    final_path = self.extract_dir / simple_name
                    
                    if temp_path.exists():
                        shutil.move(str(temp_path), str(final_path))
                        
                        extracted_files.append({
                            'path': str(final_path),
                            'original_name': member.name,
                            'size_bytes': member.size,
                            'filename': simple_name
                        })
                
                # Clean up any empty directories
                self.cleanup_empty_dirs()
                
                return extracted_files
                
        except Exception as e:
            print(f"❌ Error sampling audio files: {e}")
            return []
    
    def smart_sample_files(self, audio_members, max_files):
        """Intelligently sample files by size (as proxy for duration)"""
        # Sort by file size (larger files likely longer duration)
        sorted_files = sorted(audio_members, key=lambda x: x.size)
        
        if len(sorted_files) <= max_files:
            return sorted_files
        
        # Sample from different size ranges
        selected = []
        
        # Small files (short clips)
        small_files = sorted_files[:len(sorted_files)//3]
        selected.extend(random.sample(small_files, min(5, len(small_files))))
        
        # Medium files 
        medium_files = sorted_files[len(sorted_files)//3:2*len(sorted_files)//3]
        selected.extend(random.sample(medium_files, min(5, len(medium_files))))
        
        # Large files (long clips)
        large_files = sorted_files[2*len(sorted_files)//3:]
        selected.extend(random.sample(large_files, min(5, len(large_files))))
        
        return selected[:max_files]
    
    def cleanup_empty_dirs(self):
        """Remove empty directories after extraction"""
        for root, dirs, files in os.walk(self.extract_dir, topdown=False):
            for dir_name in dirs:
                dir_path = os.path.join(root, dir_name)
                try:
                    if not os.listdir(dir_path):
                        os.rmdir(dir_path)
                except:
                    pass
    
    def analyze_extracted_files(self, extracted_files):
        """Analyze the extracted audio files"""
        print(f"\n🔍 ANALYZING EXTRACTED FILES")
        print("=" * 50)
        
        analysis = {
            'total_files': len(extracted_files),
            'total_size_bytes': 0,
            'size_ranges': {'small': [], 'medium': [], 'large': []},
            'formats': {}
        }
        
        for file_info in extracted_files:
            size = file_info['size_bytes']
            analysis['total_size_bytes'] += size
            
            # Categorize by size
            if size < 20000:  # < 20KB
                analysis['size_ranges']['small'].append(file_info)
            elif size < 50000:  # 20-50KB
                analysis['size_ranges']['medium'].append(file_info)
            else:  # > 50KB
                analysis['size_ranges']['large'].append(file_info)
            
            # Track formats
            ext = os.path.splitext(file_info['filename'])[1]
            analysis['formats'][ext] = analysis['formats'].get(ext, 0) + 1
            
            # Try to get actual audio info
            try:
                file_path = file_info['path']
                if os.path.exists(file_path):
                    # Basic file verification
                    with open(file_path, 'rb') as f:
                        header = f.read(10)
                        if header.startswith(b'ID3') or header[1:4] == b'ID3':
                            file_info['format_verified'] = 'MP3'
                        elif header.startswith(b'RIFF'):
                            file_info['format_verified'] = 'WAV'
                        else:
                            file_info['format_verified'] = 'Unknown'
            except:
                file_info['format_verified'] = 'Error'
        
        # Print analysis
        print(f"📊 Total files: {analysis['total_files']}")
        print(f"💾 Total size: {analysis['total_size_bytes'] / 1024:.1f} KB")
        print(f"🎵 Formats: {analysis['formats']}")
        print(f"📏 Size distribution:")
        print(f"  Small (<20KB): {len(analysis['size_ranges']['small'])} files")
        print(f"  Medium (20-50KB): {len(analysis['size_ranges']['medium'])} files")
        print(f"  Large (>50KB): {len(analysis['size_ranges']['large'])} files")
        
        return analysis
    
    def create_test_manifest(self, extracted_files, analysis):
        """Create a comprehensive test manifest"""
        manifest = {
            'created': time.strftime('%Y-%m-%d %H:%M:%S'),
            'dataset_source': self.dataset_path,
            'extraction_summary': analysis,
            'test_files': extracted_files,
            'recommended_test_order': self.recommend_test_order(extracted_files)
        }
        
        manifest_path = self.extract_dir / 'test_manifest.json'
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"\n📋 Test manifest created: {manifest_path}")
        return manifest_path
    
    def recommend_test_order(self, extracted_files):
        """Recommend testing order from small to large files"""
        sorted_files = sorted(extracted_files, key=lambda x: x['size_bytes'])
        
        return [
            {
                'phase': 'Phase 1: Small Files (CPU Baseline)',
                'files': [f['filename'] for f in sorted_files[:5]],
                'purpose': 'Establish CPU transcription baseline with quick files'
            },
            {
                'phase': 'Phase 2: Medium Files (GPU Comparison)', 
                'files': [f['filename'] for f in sorted_files[5:10]],
                'purpose': 'Test GPU acceleration with moderate-length audio'
            },
            {
                'phase': 'Phase 3: Large Files (Performance Analysis)',
                'files': [f['filename'] for f in sorted_files[10:]],
                'purpose': 'Measure GPU performance gains with longer audio'
            }
        ]

def main():
    """Main execution"""
    print("🚀 DIRECT AUDIO SAMPLING FOR GPU TESTING")
    print("=" * 60)
    
    dataset_path = "tests/Audio_Test_Files/cv-corpus-22.0-delta-2025-06-20-en.tar.gz"
    
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset not found: {dataset_path}")
        return False
    
    sampler = DirectAudioSampler(dataset_path)
    
    # Extract sample files
    extracted_files = sampler.sample_audio_files(max_files=15)
    
    if not extracted_files:
        print("❌ No files extracted")
        return False
    
    # Analyze extracted files
    analysis = sampler.analyze_extracted_files(extracted_files)
    
    # Create test manifest
    manifest_path = sampler.create_test_manifest(extracted_files, analysis)
    
    print(f"\n✅ EXTRACTION COMPLETE!")
    print(f"📁 Files location: {sampler.extract_dir}")
    print(f"📋 Manifest: {manifest_path}")
    print(f"🎯 Ready for incremental GPU testing!")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
