from transformers import pipeline
import torch

# Check if GPU is available
device = "cuda:0" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load the pipeline
pipe = pipeline("automatic-speech-recognition", model="openai/whisper-base", device=device)

# Transcribe the audio
audio_file = "C:/Users/carde/.cache/kagglehub/datasets/pavanelisetty/sample-audio-files-for-speech-recognition/versions/1/harvard.wav"
print(f"Transcribing {audio_file}...")
try:
    result = pipe(audio_file, return_timestamps=True, generate_kwargs={"language": "english"})
    print("Transcription result:")
    print(result)
except KeyboardInterrupt:
    print("Transcription process interrupted.")