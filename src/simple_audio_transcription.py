#!/usr/bin/env python3
"""
Simple Audio Transcription Script
Handles audio transcription with fallback mechanisms when models can't be downloaded
"""

import sys
import os
import json
import tempfile
import traceback

def create_dummy_transcription(audio_path):
    """Create a dummy transcription when models are unavailable"""
    filename = os.path.basename(audio_path)
    return f"""# Audio Transcription (Offline Mode)

**File:** {filename}
**Status:** Model unavailable - offline transcription
**Note:** This is a placeholder transcription. Audio models require internet connectivity to download.

## Transcription
[Audio transcription unavailable - Whisper models could not be downloaded]

To fix this issue:
1. Ensure internet connectivity for initial model download
2. Consider pre-downloading models in the environment
3. Use GPU-accelerated faster-whisper for better performance

**Technical Details:**
- File path: {audio_path}
- File exists: {os.path.exists(audio_path)}
- File size: {os.path.getsize(audio_path) if os.path.exists(audio_path) else 'unknown'} bytes
"""

def transcribe_audio_simple(audio_path, language="en"):
    """
    Simple audio transcription with fallback
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    try:
        # Try to import and use whisper
        import whisper
        
        # Try to load a pre-downloaded model first
        model_path = os.path.expanduser("~/.cache/whisper")
        available_models = []
        
        if os.path.exists(model_path):
            available_models = [f for f in os.listdir(model_path) if f.endswith('.pt')]
        
        if available_models:
            # Use the smallest available model
            model_name = "tiny" if any("tiny" in m for m in available_models) else "base"
            print(f"Using cached model: {model_name}", file=sys.stderr)
        else:
            # Try to download tiny model (fastest)
            model_name = "tiny"
            print(f"Attempting to download model: {model_name}", file=sys.stderr)
        
        try:
            model = whisper.load_model(model_name)
            result = model.transcribe(audio_path, language=language)
            
            text = result["text"].strip()
            detected_language = result.get("language", language)
            
            # Create proper markdown output
            filename = os.path.basename(audio_path)
            markdown = f"""# Audio Transcription

**File:** {filename}
**Language:** {detected_language}
**Model:** {model_name}

## Transcription

{text}
"""
            return markdown
            
        except Exception as model_error:
            print(f"Model loading/transcription failed: {model_error}", file=sys.stderr)
            # Fall back to dummy transcription
            return create_dummy_transcription(audio_path)
            
    except ImportError:
        print("Whisper not available", file=sys.stderr)
        return create_dummy_transcription(audio_path)
    except Exception as e:
        print(f"Transcription error: {e}", file=sys.stderr)
        return create_dummy_transcription(audio_path)

def main():
    """Main entry point for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python simple_audio_transcription.py <audio_file> [language]")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else "en"
    
    try:
        result = transcribe_audio_simple(audio_path, language)
        print(result)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        # Still output something useful
        print(create_dummy_transcription(audio_path))
        sys.exit(1)

if __name__ == "__main__":
    main()