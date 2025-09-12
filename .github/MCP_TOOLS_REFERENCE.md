# MCP Tools Quick Reference for GitHub Copilot

## Enhanced Audio Transcription Tools

### 🎵 `enhanced-audio-to-markdown`
GPU-accelerated audio transcription with RTX 3060 optimization.

```json
{
  "name": "enhanced-audio-to-markdown",
  "arguments": {
    "filepath": "/path/to/audio.mp3",
    "language": "en",
    "modelSize": "medium",
    "device": "auto",
    "asyncMode": false
  }
}
```

**Performance**: 19.4x real-time on RTX 3060, automatic CPU fallback

### 📊 `audio-transcription-status`
Check status of asynchronous transcription tasks.

```json
{
  "name": "audio-transcription-status", 
  "arguments": {
    "taskId": "task_1699123456789_abc123"
  }
}
```

**Returns**: Task progress, completion status, and results

## File Conversion Tools

### 📄 `pdf-to-markdown`
Convert PDF files to Markdown with text extraction.

```json
{
  "name": "pdf-to-markdown",
  "arguments": {
    "filepath": "/path/to/document.pdf"
  }
}
```

### 🖼️ `image-to-markdown`
Convert images to Markdown with OCR text extraction.

```json
{
  "name": "image-to-markdown",
  "arguments": {
    "filepath": "/path/to/image.png"
  }
}
```

### 📝 `docx-to-markdown`
Convert Microsoft Word documents to Markdown.

```json
{
  "name": "docx-to-markdown",
  "arguments": {
    "filepath": "/path/to/document.docx"
  }
}
```

### 📊 `xlsx-to-markdown`
Convert Excel spreadsheets to Markdown tables.

```json
{
  "name": "xlsx-to-markdown",
  "arguments": {
    "filepath": "/path/to/spreadsheet.xlsx"
  }
}
```

### 📈 `pptx-to-markdown`
Convert PowerPoint presentations to Markdown.

```json
{
  "name": "pptx-to-markdown",
  "arguments": {
    "filepath": "/path/to/presentation.pptx"
  }
}
```

## Web Content Tools

### 🎬 `youtube-to-markdown`
Extract YouTube video transcripts and metadata.

```json
{
  "name": "youtube-to-markdown",
  "arguments": {
    "url": "https://youtube.com/watch?v=VIDEO_ID"
  }
}
```

### 🔍 `bing-search-to-markdown`
Perform Bing web searches and format results.

```json
{
  "name": "bing-search-to-markdown",
  "arguments": {
    "query": "search terms",
    "count": 10
  }
}
```

### 🌐 `webpage-to-markdown`
Convert web pages to clean Markdown format.

```json
{
  "name": "webpage-to-markdown",
  "arguments": {
    "url": "https://example.com/page"
  }
}
```

## File Management Tools

### 📁 `get-markdown-file`
Retrieve existing Markdown files by path.

```json
{
  "name": "get-markdown-file",
  "arguments": {
    "filepath": "/path/to/existing.md"
  }
}
```

### 🎤 `audio-to-markdown` (Legacy)
Original CPU-only audio transcription (use enhanced version for better performance).

```json
{
  "name": "audio-to-markdown",
  "arguments": {
    "filepath": "/path/to/audio.wav"
  }
}
```

## Usage Examples for GitHub Copilot

### Transcribe Audio with GPU Acceleration
```typescript
// Use enhanced audio tool for best performance
const result = await mcpClient.callTool({
  name: "enhanced-audio-to-markdown",
  arguments: {
    filepath: "meeting_recording.mp3",
    language: "en",
    modelSize: "medium",
    device: "auto"
  }
});
```

### Async Audio Processing
```typescript
// Start async transcription
const taskResult = await mcpClient.callTool({
  name: "enhanced-audio-to-markdown", 
  arguments: {
    filepath: "long_audio.wav",
    asyncMode: true
  }
});

const taskId = taskResult.taskId;

// Check status
const statusResult = await mcpClient.callTool({
  name: "audio-transcription-status",
  arguments: { taskId }
});
```

### Batch Document Processing
```typescript
// Convert multiple file types
const files = [
  { type: "pdf", path: "report.pdf" },
  { type: "docx", path: "memo.docx" },
  { type: "pptx", path: "slides.pptx" }
];

for (const file of files) {
  const result = await mcpClient.callTool({
    name: `${file.type}-to-markdown`,
    arguments: { filepath: file.path }
  });
}
```

## Performance Notes

- **Enhanced Audio**: 19.4x real-time on RTX 3060, automatic CPU fallback
- **PDF Processing**: Handles large documents with progressive processing
- **Image OCR**: High-accuracy text extraction from images
- **Web Content**: Intelligent content extraction and cleaning
- **Async Support**: Non-blocking processing for large files

## Error Handling

All tools include comprehensive error handling with:
- Graceful fallback strategies
- Detailed error messages
- Recovery suggestions
- Progress reporting for long operations

## Environment Requirements

- **Node.js**: 20.x LTS
- **Python**: 3.11+ with UV package manager
- **Optional GPU**: CUDA 12.1 for enhanced audio performance
- **FFmpeg**: For audio format conversion
- **Internet**: For model downloads and web content access
