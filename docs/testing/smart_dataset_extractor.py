#!/usr/bin/env python3
"""
Smart Common Voice Dataset Analysis and Testing
Cherry-pick representative audio files for incremental GPU testing
"""

import os
import sys
import tarfile
import csv
import random
import shutil
from pathlib import Path
import json
import time

class SmartDatasetTester:
    def __init__(self, dataset_path, extract_dir="tests/cv_sample"):
        self.dataset_path = dataset_path
        self.extract_dir = Path(extract_dir)
        self.extract_dir.mkdir(parents=True, exist_ok=True)
        self.test_files = []
        
    def analyze_dataset_structure(self):
        """Analyze the dataset without extracting everything"""
        print("🔍 ANALYZING DATASET STRUCTURE")
        print("=" * 50)
        
        file_size = os.path.getsize(self.dataset_path)
        print(f"📁 Dataset size: {file_size / 1024**3:.2f} GB")
        
        try:
            with tarfile.open(self.dataset_path, 'r:gz') as tar:
                members = tar.getmembers()
                print(f"📦 Total files in archive: {len(members)}")
                
                # Analyze file types and structure
                directories = []
                audio_files = []
                csv_files = []
                other_files = []
                
                for member in members[:1000]:  # Sample first 1000 for analysis
                    if member.isdir():
                        directories.append(member.name)
                    elif member.name.endswith(('.mp3', '.wav', '.ogg', '.flac')):
                        audio_files.append(member.name)
                    elif member.name.endswith('.csv'):
                        csv_files.append(member.name)
                    else:
                        other_files.append(member.name)
                
                print(f"📂 Directories found: {len(set(directories))}")
                print(f"🎵 Audio files (sample): {len(audio_files)}")
                print(f"📊 CSV files: {len(csv_files)}")
                print(f"📄 Other files: {len(other_files)}")
                
                # Show directory structure
                unique_dirs = list(set([d.split('/')[0] for d in directories if '/' in d]))[:10]
                print(f"📁 Main directories: {unique_dirs}")
                
                # Show audio file extensions
                extensions = list(set([f.split('.')[-1] for f in audio_files]))
                print(f"🎵 Audio formats: {extensions}")
                
                return {
                    'total_files': len(members),
                    'directories': directories,
                    'audio_files': audio_files,
                    'csv_files': csv_files,
                    'audio_formats': extensions
                }
                
        except Exception as e:
            print(f"❌ Error analyzing dataset: {e}")
            return None
    
    def extract_metadata_files(self):
        """Extract just the CSV metadata files first"""
        print("\n📊 EXTRACTING METADATA FILES")
        print("=" * 50)
        
        try:
            with tarfile.open(self.dataset_path, 'r:gz') as tar:
                # Find and extract CSV files
                csv_members = [m for m in tar.getmembers() if m.name.endswith('.csv')]
                
                print(f"📄 Found {len(csv_members)} CSV files")
                
                for member in csv_members:
                    if member.isfile():
                        print(f"📥 Extracting: {member.name}")
                        tar.extract(member, self.extract_dir)
                
                return [str(self.extract_dir / m.name) for m in csv_members if m.isfile()]
                
        except Exception as e:
            print(f"❌ Error extracting metadata: {e}")
            return []
    
    def analyze_metadata(self, csv_files):
        """Analyze CSV metadata to find good test candidates"""
        print("\n🧮 ANALYZING METADATA FOR SMART SAMPLING")
        print("=" * 50)
        
        test_candidates = []
        
        for csv_file in csv_files:
            if not os.path.exists(csv_file):
                continue
                
            print(f"📊 Analyzing: {os.path.basename(csv_file)}")
            
            try:
                with open(csv_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    
                print(f"  📝 Rows: {len(rows)}")
                
                if rows:
                    # Show available columns
                    columns = list(rows[0].keys())
                    print(f"  📋 Columns: {columns}")
                    
                    # Look for duration/length information
                    duration_cols = [c for c in columns if 'duration' in c.lower() or 'length' in c.lower()]
                    if duration_cols:
                        print(f"  ⏱️  Duration columns: {duration_cols}")
                    
                    # Sample rows by different criteria
                    sampled_rows = self.smart_sample_rows(rows)
                    test_candidates.extend(sampled_rows)
                    
            except Exception as e:
                print(f"  ❌ Error reading CSV: {e}")
        
        return test_candidates
    
    def smart_sample_rows(self, rows, max_samples=20):
        """Intelligently sample rows for diverse testing"""
        if len(rows) <= max_samples:
            return rows
        
        # Try to get diverse samples
        samples = []
        
        # Group by duration if available
        duration_col = None
        for col in rows[0].keys():
            if 'duration' in col.lower():
                duration_col = col
                break
        
        if duration_col:
            # Sort by duration and pick from different ranges
            try:
                valid_rows = [r for r in rows if r.get(duration_col) and str(r[duration_col]).replace('.','').isdigit()]
                valid_rows.sort(key=lambda x: float(x[duration_col]))
                
                if len(valid_rows) >= max_samples:
                    # Pick from different duration ranges
                    chunk_size = len(valid_rows) // max_samples
                    for i in range(max_samples):
                        idx = min(i * chunk_size, len(valid_rows) - 1)
                        samples.append(valid_rows[idx])
                else:
                    samples.extend(valid_rows[:max_samples])
                    
            except (ValueError, KeyError):
                # Fallback to random sampling
                samples = random.sample(rows, min(max_samples, len(rows)))
        else:
            # Random sampling if no duration info
            samples = random.sample(rows, min(max_samples, len(rows)))
        
        return samples
    
    def extract_selected_audio_files(self, candidates):
        """Extract only the selected audio files"""
        print(f"\n🎵 EXTRACTING SELECTED AUDIO FILES ({len(candidates)} files)")
        print("=" * 50)
        
        extracted_files = []
        
        try:
            with tarfile.open(self.dataset_path, 'r:gz') as tar:
                all_members = {m.name: m for m in tar.getmembers()}
                
                for i, candidate in enumerate(candidates):
                    # Find the audio file path
                    audio_path = candidate.get('path', candidate.get('filename', ''))
                    
                    if not audio_path:
                        continue
                    
                    # Look for the file in the archive
                    possible_paths = [
                        audio_path,
                        f"clips/{audio_path}",
                        f"en/clips/{audio_path}",
                        f"cv-corpus-22.0-delta-2025-06-20/en/clips/{audio_path}"
                    ]
                    
                    found_path = None
                    for path in possible_paths:
                        if path in all_members:
                            found_path = path
                            break
                    
                    if found_path:
                        member = all_members[found_path]
                        if member.isfile():
                            print(f"📥 [{i+1}/{len(candidates)}] Extracting: {os.path.basename(audio_path)}")
                            tar.extract(member, self.extract_dir)
                            
                            extracted_path = self.extract_dir / found_path
                            if extracted_path.exists():
                                # Copy to a simpler structure
                                simple_name = f"test_{i+1:03d}_{os.path.basename(audio_path)}"
                                simple_path = self.extract_dir / simple_name
                                shutil.copy2(extracted_path, simple_path)
                                
                                extracted_files.append({
                                    'path': str(simple_path),
                                    'original_path': found_path,
                                    'metadata': candidate,
                                    'size_bytes': os.path.getsize(simple_path)
                                })
                    else:
                        print(f"⚠️  Audio file not found: {audio_path}")
                
        except Exception as e:
            print(f"❌ Error extracting audio files: {e}")
        
        return extracted_files
    
    def create_test_manifest(self, extracted_files):
        """Create a test manifest with file information"""
        manifest = {
            'created': time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_files': len(extracted_files),
            'files': []
        }
        
        for file_info in extracted_files:
            file_path = file_info['path']
            
            # Get file stats
            stats = {
                'filename': os.path.basename(file_path),
                'path': file_path,
                'size_bytes': file_info['size_bytes'],
                'size_kb': file_info['size_bytes'] / 1024,
                'format': os.path.splitext(file_path)[1],
                'metadata': file_info['metadata']
            }
            
            # Try to get audio duration if possible
            try:
                import wave
                if stats['format'].lower() == '.wav':
                    with wave.open(file_path, 'rb') as wav_file:
                        frames = wav_file.getnframes()
                        rate = wav_file.getframerate()
                        duration = frames / rate
                        stats['duration_seconds'] = duration
            except:
                pass
            
            manifest['files'].append(stats)
        
        # Save manifest
        manifest_path = self.extract_dir / 'test_manifest.json'
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"\n📋 Test manifest saved: {manifest_path}")
        return manifest_path

def main():
    """Main execution function"""
    print("🚀 SMART COMMON VOICE DATASET TESTING")
    print("=" * 60)
    
    dataset_path = "tests/Audio_Test_Files/cv-corpus-22.0-delta-2025-06-20-en.tar.gz"
    
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset not found: {dataset_path}")
        return False
    
    tester = SmartDatasetTester(dataset_path)
    
    # Step 1: Analyze structure
    structure = tester.analyze_dataset_structure()
    if not structure:
        return False
    
    # Step 2: Extract metadata
    csv_files = tester.extract_metadata_files()
    if not csv_files:
        print("⚠️  No metadata files found, proceeding with basic extraction...")
        return False
    
    # Step 3: Analyze metadata for smart sampling
    candidates = tester.analyze_metadata(csv_files)
    if not candidates:
        print("⚠️  No suitable candidates found in metadata")
        return False
    
    print(f"\n🎯 Selected {len(candidates)} test candidates")
    
    # Step 4: Extract selected audio files
    extracted_files = tester.extract_selected_audio_files(candidates)
    
    if extracted_files:
        print(f"\n✅ Successfully extracted {len(extracted_files)} test files")
        
        # Step 5: Create test manifest
        manifest_path = tester.create_test_manifest(extracted_files)
        
        # Show summary
        total_size = sum(f['size_bytes'] for f in extracted_files)
        print(f"\n📊 EXTRACTION SUMMARY:")
        print(f"  🎵 Files extracted: {len(extracted_files)}")
        print(f"  💾 Total size: {total_size / 1024:.1f} KB ({total_size / 1024**2:.2f} MB)")
        print(f"  📁 Extract location: {tester.extract_dir}")
        print(f"  📋 Manifest: {manifest_path}")
        
        return True
    else:
        print("❌ No files were successfully extracted")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
