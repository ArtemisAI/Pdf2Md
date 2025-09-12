# Audio Transcription Issues

This document details the issues found with the `audio-to-markdown` tool.

## 1. "Could not transcribe this audio" Error - RESOLVED

**Diagnosis:** This error was caused by the Whisper model not being downloaded. After downloading the model, this error was resolved.

**Steps Taken:**
1. Created a Python script to download the Whisper model.
2. Executed the script to download the model.
3. Successfully transcribed a `.wav` file using the `audio-to-markdown` tool.

## 2. `UnsupportedFormatException` for .flac files

**Diagnosis:** The `markitdown` library does not support the `.flac` format.

**Steps Taken:**
1. Attempted to convert a `.flac` file, which resulted in an `UnsupportedFormatException`.

## Suggested Next Steps
- Add support for the `.flac` format to the `markitdown` library.