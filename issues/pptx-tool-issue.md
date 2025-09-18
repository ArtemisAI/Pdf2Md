# PPTX to Markdown Tool Issue

## Issue: PPTX Tool Returning Webpage Content Instead of PowerPoint Data

### Problem Description
The `pptx-to-markdown` tool is not properly processing PowerPoint files. Instead of converting the PowerPoint file content to Markdown, it returns generic webpage content (appears to be University of North Florida website content).

### Steps to Reproduce
1. Use the PPTX tool with a valid PowerPoint file (e.g., `/home/agent/Projects/Pdf2Md/tests/Test_2.pptx`)
2. Tool returns webpage content instead of PowerPoint data

### Expected Behavior
- Tool should read the PowerPoint file and convert its content to Markdown format
- Should extract slides, text, and formatting from the PPTX file

### Actual Behavior
- Returns University of North Florida webpage content (404 error page)
- No PowerPoint data is processed or converted

### Environment
- HTTP-MCP server running on localhost:3000
- Test file: `Test_2.pptx` exists in `/tests/` directory
- Tool called via MCP protocol

### Impact
- PPTX file conversion functionality is completely broken
- Users cannot convert PowerPoint files to Markdown

### Additional Context
- DOCX tool works correctly with same test approach
- Audio and webpage tools also work correctly
- This suggests a specific issue with PPTX file processing logic
- Similar pattern to XLSX issue - both return webpage content instead of file data

### Files Affected
- `src/tools.ts` - PPTX tool implementation
- Test file: `tests/Test_2.pptx`

### Priority
High - Core file conversion functionality is broken

### Labels
bug, file-processing, pptx

### Assignee
@ArtemisAI
