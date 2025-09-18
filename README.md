# Markdownify MCP Server

**Repository:** https://github.com/ArtemisAI/Pdf2Md

![markdownify mcp logo](logo.jpg)

Markdownify is a Model Context Protocol (MCP) server that converts various file types and web content to Markdown format. This ArtemisAI fork includes **Docker Compose deployment** for external access and **GPU-accelerated audio transcription**.

<a href="https://glama.ai/mcp/servers/bn5q4b0ett"><img width="380" height="200" src="https://glama.ai/mcp/servers/bn5q4b0ett/badge" alt="Markdownify Server MCP server" /></a>

## 🚀 Quick Start with Docker Compose

The fastest way to get started is with Docker Compose:

```bash
# Clone and setup
git clone https://github.com/ArtemisAI/Pdf2Md.git
cd Pdf2Md
cp .env.example .env

# Start the server  
docker-compose up -d

# Verify it's working
curl http://localhost:3000/health
```

**MCP Server URL:** `http://localhost:3000/mcp` (streamable-http transport)

### Configure Your IDE

**VS Code / GitHub Copilot:**
```json
{
  "servers": {
    "Pdf2Md": {
      "url": "http://localhost:3000/mcp",
      "type": "http"
    }
  }
}
```

**Roo Code:** Already configured at `.roo/mcp.json`

## Repository

This is the ArtemisAI fork of the Markdownify MCP Server.

- **Original Repository:** https://github.com/zcaceres/markdownify-mcp
- **ArtemisAI Fork:** https://github.com/ArtemisAI/Pdf2Md

This fork focuses on Docker deployment, Windows compatibility, and GPU acceleration.

## Features

- Convert multiple file types to Markdown:
  - PDF
  - Images (with OCR)
  - Audio (with transcription and **🆕 GPU acceleration**)
  - DOCX
  - XLSX
  - PPTX
- Convert web content to Markdown:
  - YouTube videos (with transcripts)
  - Web pages
  - Bing search results
- Retrieve existing Markdown files
- **🆕 Docker Compose deployment** for external access
- **🆕 HTTP-streamable architecture** for always-available service

## 📋 Change Request System

This project uses a structured change request system for development planning and tracking:

- **📁 Location**: `.github/change-requests/`
- **📝 Template**: `.github/prompts/change-request.prompt.md`
- **📊 Tracking**: `.github/change-requests/CHANGE_REQUEST_TRACKING.md`

### Current Status
- **✅ Completed**: Docker Compose deployment, HTTP-streamable MCP server
- **✅ Completed**: GPU integration (19.4x real-time transcription speed)
- **🔄 Active**: Documentation and integration guides

See [Change Request Tracking](.github/change-requests/CHANGE_REQUEST_TRACKING.md) for full details.
- Convert web content to Markdown:
  - YouTube video transcripts
  - Bing search results
  - General web pages
- Retrieve existing Markdown files

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   pnpm install
   ```

Note: this will also install `uv` and related Python depdencies.

3. Build the project:
   ```
   pnpm run build
   ```
4. Start the server:
   ```
   pnpm start
   ```

## Development

- Use `pnpm run dev` to start the TypeScript compiler in watch mode
- Modify `src/server.ts` to customize server behavior
- Add or modify tools in `src/tools.ts`

## Usage with Desktop App

To integrate this server with a desktop app, add the following to your app's server configuration:

```js
{
  "mcpServers": {
    "markdownify": {
      "command": "node",
      "args": [
        "{ABSOLUTE PATH TO FILE HERE}/dist/index.js"
      ],
      "env": {
        // By default, the server will use the default install location of `uv`
        "UV_PATH": "/path/to/uv"
      }
    }
  }
}
```

## Available Tools

- `youtube-to-markdown`: Convert YouTube videos to Markdown
- `pdf-to-markdown`: Convert PDF files to Markdown
- `bing-search-to-markdown`: Convert Bing search results to Markdown
- `webpage-to-markdown`: Convert web pages to Markdown
- `image-to-markdown`: Convert images to Markdown with metadata
- `audio-to-markdown`: Convert audio files to Markdown with transcription
- `docx-to-markdown`: Convert DOCX files to Markdown
- `xlsx-to-markdown`: Convert XLSX files to Markdown
- `pptx-to-markdown`: Convert PPTX files to Markdown
- `get-markdown-file`: Retrieve an existing Markdown file. File extension must end with: *.md, *.markdown.
  
  OPTIONAL: set `MD_SHARE_DIR` env var to restrict the directory from which files can be retrieved, e.g. `MD_SHARE_DIR=[SOME_PATH] pnpm run start` 

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
