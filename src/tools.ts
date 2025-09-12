import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";

export const YouTubeToMarkdownTool = ToolSchema.parse({
  name: "youtube-to-markdown",
  description:
    "Convert a YouTube video to markdown, including transcript if available",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL of the YouTube video",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["url"],
  },
});

export const PDFToMarkdownTool = ToolSchema.parse({
  name: "pdf-to-markdown",
  description: "Convert a PDF file to markdown",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the PDF file to convert",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["filepath"],
  },
});

export const BingSearchResultToMarkdownTool = ToolSchema.parse({
  name: "bing-search-to-markdown",
  description: "Convert a Bing search results page to markdown",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL of the Bing search results page",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["url"],
  },
});

export const WebpageToMarkdownTool = ToolSchema.parse({
  name: "webpage-to-markdown",
  description: "Convert a webpage to markdown",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL of the webpage to convert",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["url"],
  },
});

export const ImageToMarkdownTool = ToolSchema.parse({
  name: "image-to-markdown",
  description:
    "Convert an image to markdown, including metadata and description",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the image file to convert",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["filepath"],
  },
});

export const AudioToMarkdownTool = ToolSchema.parse({
  name: "audio-to-markdown",
  description:
    "Convert an audio file to markdown, including transcription if possible",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the audio file to convert",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["filepath"],
  },
});

export const DocxToMarkdownTool = ToolSchema.parse({
  name: "docx-to-markdown",
  description: "Convert a DOCX file to markdown",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the DOCX file to convert",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["filepath"],
  },
});

export const XlsxToMarkdownTool = ToolSchema.parse({
  name: "xlsx-to-markdown",
  description: "Convert an XLSX file to markdown",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the XLSX file to convert",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["filepath"],
  },
});

export const PptxToMarkdownTool = ToolSchema.parse({
  name: "pptx-to-markdown",
  description: "Convert a PPTX file to markdown",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the PPTX file to convert",
      },
    },
    required: ["filepath"],
  },
});

// Enhanced Audio Transcription Tools (RTX 3060 Optimized)
export const EnhancedAudioToMarkdownTool = ToolSchema.parse({
  name: "enhanced-audio-to-markdown",
  description: "Convert an audio file to markdown with RTX 3060 GPU-optimized transcription, advanced error handling, and real-time progress tracking",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the audio file to convert",
      },
      language: {
        type: "string",
        description: "Language code for transcription (e.g., 'en', 'es', 'fr'). Defaults to 'en'",
      },
      modelSize: {
        type: "string",
        enum: ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"],
        description: "Whisper model size. Auto-selected based on RTX 3060 GPU capability if not specified",
      },
      device: {
        type: "string",
        enum: ["auto", "cpu", "cuda", "cuda:0"],
        description: "Device to use for transcription. 'auto' detects optimal device (RTX 3060 preferred)",
      },
      asyncMode: {
        type: "boolean",
        description: "Process asynchronously and return task ID for status checking",
      },
      uvPath: {
        type: "string",
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["filepath"],
  },
});

export const AudioTranscriptionStatusTool = ToolSchema.parse({
  name: "audio-transcription-status",
  description: "Check the status of an asynchronous audio transcription task",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "Task ID returned from enhanced-audio-to-markdown in async mode",
      },
    },
    required: ["taskId"],
  },
});

export const GetMarkdownFileTool = ToolSchema.parse({
  name: "get-markdown-file",
  description: "Get a markdown file by absolute file path",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path to file of markdown'd text",
      },
    },
    required: ["filepath"],
  },
});
