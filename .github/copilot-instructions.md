# GitHub Copilot Instructions for Pdf2Md MCP Server

## Repository Information
- **Repository URL:** https://github.com/ArtemisAI/Pdf2Md
- **Owner:** ArtemisAI
- **Description:** Model Context Protocol (MCP) server for converting various file types and web content to Markdown format

## Project Overview
This is a fork of the original Markdownify MCP server, maintained by ArtemisAI. The project provides tools to convert PDFs, images, audio files, web pages, and other content types to Markdown format using the Model Context Protocol.

## Key Features
- Convert multiple file types to Markdown (PDF, DOCX, XLSX, PPTX, images, audio)
- Convert web content to Markdown (YouTube transcripts, Bing search results, web pages)
- Retrieve existing Markdown files
- Windows compatibility support

## Development Guidelines
- Use TypeScript for all new code
- Follow the existing MCP server architecture
- Test all changes on Windows platform
- Update dependencies as needed for Windows compatibility
- Document any platform-specific issues or fixes

## Testing
- Comprehensive test files are available in the `tests/` directory
- Test all MCP tools before committing changes
- Document any issues found during testing
- Ensure Windows compatibility for all features

## Contributing
- Create feature branches for new work
- Test thoroughly on Windows before submitting PRs
- Update README and documentation as needed
- Follow existing code style and patterns

## Important Notes
- This fork specifically addresses Windows compatibility issues
- Original repository: https://github.com/zcaceres/markdownify-mcp
- Windows testing and support is a priority for this fork
