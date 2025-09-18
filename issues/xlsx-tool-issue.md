# XLSX to Markdown Tool Issue

## Issue: XLSX Tool Returning Webpage Content Instead of Excel Data

### Problem Description
The `xlsx-to-markdown` tool is not properly processing Excel files. Instead of converting the Excel file content to Markdown, it returns generic webpage content (appears to be Microsoft Surface product page content).

### Steps to Reproduce
1. Use the XLSX tool with a valid Excel file (e.g., `/home/agent/Projects/Pdf2Md/tests/test_spreadsheet.xlsx`)
2. Tool returns webpage content instead of Excel data

### Expected Behavior
- Tool should read the Excel file and convert its content to Markdown format
- Should extract tables, data, and formatting from the XLSX file

### Actual Behavior
- Returns Microsoft Surface webpage content
- No Excel data is processed or converted

### Environment
- HTTP-MCP server running on localhost:3000
- Test file: `test_spreadsheet.xlsx` exists in `/tests/` directory
- Tool called via MCP protocol

### Impact
- XLSX file conversion functionality is completely broken
- Users cannot convert Excel files to Markdown

### Additional Context
- DOCX tool works correctly with same test approach
- Audio and webpage tools also work correctly
- This suggests a specific issue with XLSX file processing logic

### Files Affected
- `src/tools.ts` - XLSX tool implementation
- Test file: `tests/test_spreadsheet.xlsx`

### Priority
High - Core file conversion functionality is broken

### Labels
bug, file-processing, xlsx

### Assignee
@ArtemisAI
