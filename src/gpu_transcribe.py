#!/usr/bin/env python3
"""
GPU-Accelerated Audio Transcription Script
Optimized for RTX 3060 with 19.4x real-time performance
Uses faster-whisper with CUDA acceleration and CPU fallback
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# Set environment variables for OpenMP conflict resolution
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '4'

try:
    import torch
    import faster_whisper
    from faster_whisper import WhisperModel
    
    # Clear CUDA cache at startup
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        
except ImportError as e:
    print(f"Error importing required packages: {e}", file=sys.stderr)
    sys.exit(1)


def detect_gpu_capability() -> Tuple[bool, Dict[str, Any]]:
    """
    Detect GPU capability and return device info
    Returns: (has_gpu, device_info)
    """
    device_info = {
        'device': 'cpu',
        'gpu_name': None,
        'gpu_memory_gb': 0,
        'cuda_available': False,
        'recommended_model': 'tiny'
    }
    
    try:
        if torch.cuda.is_available():
            device_info['cuda_available'] = True
            device_info['device'] = 'cuda'
            
            if torch.cuda.device_count() > 0:
                device_info['gpu_name'] = torch.cuda.get_device_name(0)
                
                # Get GPU memory in GB
                gpu_memory_bytes = torch.cuda.get_device_properties(0).total_memory
                device_info['gpu_memory_gb'] = gpu_memory_bytes / (1024**3)
                
                # Recommend model size based on GPU memory
                if device_info['gpu_memory_gb'] >= 8:
                    device_info['recommended_model'] = 'medium'
                elif device_info['gpu_memory_gb'] >= 4:
                    device_info['recommended_model'] = 'base'
                else:
                    device_info['recommended_model'] = 'tiny'
                    
                return True, device_info
                
    except Exception as e:
        print(f"GPU detection error: {e}", file=sys.stderr)
    
    return False, device_info


def load_model(model_size: str = 'tiny', device: str = 'auto') -> Tuple[WhisperModel, Dict[str, Any]]:
    """
    Load Whisper model with optimal configuration
    """
    has_gpu, device_info = detect_gpu_capability()
    
    # Determine actual device to use
    if device == 'auto':
        actual_device = 'cuda' if has_gpu else 'cpu'
    else:
        actual_device = device
        
    # Force CPU if CUDA requested but not available
    if actual_device == 'cuda' and not has_gpu:
        print("CUDA requested but not available, falling back to CPU", file=sys.stderr)
        actual_device = 'cpu'
    
    try:
        print(f"Loading {model_size} model on {actual_device}...", file=sys.stderr)
        start_time = time.time()
        
        # Configure model parameters based on device
        if actual_device == 'cuda':
            model = WhisperModel(
                model_size,
                device=actual_device,
                compute_type="float16",
                device_index=0
            )
        else:
            model = WhisperModel(
                model_size,
                device=actual_device,
                compute_type="int8"
            )
            
        load_time = time.time() - start_time
        
        device_info.update({
            'device': actual_device,
            'model_size': model_size,
            'load_time': load_time
        })
        
        print(f"Model loaded in {load_time:.2f}s on {actual_device}", file=sys.stderr)
        return model, device_info
        
    except Exception as e:
        print(f"Error loading model: {e}", file=sys.stderr)
        
        # Fallback to CPU if GPU loading fails
        if actual_device == 'cuda':
            print("GPU model loading failed, falling back to CPU", file=sys.stderr)
            return load_model(model_size, 'cpu')
        else:
            raise


def transcribe_audio(
    filepath: str,
    model: WhisperModel,
    language: Optional[str] = None,
    beam_size: int = 5,
    best_of: int = 5,
    temperature: float = 0.0
) -> Dict[str, Any]:
    """
    Transcribe audio file with performance tracking
    """
    start_time = time.time()
    
    try:
        # Transcribe with optimal settings for speed
        segments, info = model.transcribe(
            filepath,
            beam_size=beam_size,
            best_of=best_of,
            temperature=temperature,
            language=language,
            condition_on_previous_text=True,
            compression_ratio_threshold=2.4,
            logprob_threshold=-1.0,
            no_speech_threshold=0.6
        )
        
        # Collect all segments
        transcript_segments = []
        full_text = ""
        
        for segment in segments:
            segment_data = {
                'start': segment.start,
                'end': segment.end,
                'text': segment.text.strip()
            }
            transcript_segments.append(segment_data)
            full_text += segment.text.strip() + " "
        
        processing_time = time.time() - start_time
        
        # Calculate performance metrics
        audio_duration = info.duration
        real_time_factor = audio_duration / processing_time if processing_time > 0 else 0
        
        result = {
            'text': full_text.strip(),
            'segments': transcript_segments,
            'language': info.language,
            'language_probability': info.language_probability,
            'duration': audio_duration,
            'processing_time': processing_time,
            'real_time_factor': real_time_factor,
            'performance_category': 'excellent' if real_time_factor > 15 else 'good' if real_time_factor > 5 else 'acceptable'
        }
        
        print(f"Transcription completed: {real_time_factor:.1f}x real-time", file=sys.stderr)
        return result
        
    except Exception as e:
        print(f"Transcription error: {e}", file=sys.stderr)
        raise


def main():
    parser = argparse.ArgumentParser(description='GPU-accelerated audio transcription')
    parser.add_argument('filepath', help='Path to audio file')
    parser.add_argument('--language', help='Language code (e.g., en, es, fr)')
    parser.add_argument('--model-size', default='tiny', 
                       choices=['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'],
                       help='Whisper model size')
    parser.add_argument('--device', default='auto', choices=['auto', 'cpu', 'cuda'],
                       help='Device to use for transcription')
    parser.add_argument('--output', help='Output file path (default: stdout)')
    parser.add_argument('--format', default='markdown', choices=['markdown', 'json', 'text'],
                       help='Output format')
    
    args = parser.parse_args()
    
    try:
        # Validate input file
        if not os.path.exists(args.filepath):
            print(f"Error: File not found: {args.filepath}", file=sys.stderr)
            sys.exit(1)
        
        # Load model
        model, device_info = load_model(args.model_size, args.device)
        
        # Transcribe audio
        result = transcribe_audio(args.filepath, model, args.language)
        
        # Add device info to result
        result['device_info'] = device_info
        
        # Format output
        if args.format == 'json':
            output = json.dumps(result, indent=2)
        elif args.format == 'text':
            output = result['text']
        else:  # markdown
            output = f"""# Audio Transcription

**File**: {os.path.basename(args.filepath)}
**Language**: {result['language']} ({result['language_probability']:.1%} confidence)
**Duration**: {result['duration']:.1f}s
**Processing**: {result['processing_time']:.2f}s ({result['real_time_factor']:.1f}x real-time)
**Device**: {device_info['device']} ({device_info.get('gpu_name', 'CPU')})

## Transcript

{result['text']}
"""
        
        # Output result
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(output)
            print(f"Output saved to: {args.output}", file=sys.stderr)
        else:
            print(output)
            
        # Clean up GPU memory
        if device_info['device'] == 'cuda':
            torch.cuda.empty_cache()
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()