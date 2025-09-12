# Pdf2Md MCP Server — Issues Report

This document catalogs all known issues, test results, diagnosis, steps already tried, and suggestions for further investigation.

---

## 1. PPTX Conversion Fails for Local Files and .ppt Format

**Tool:** `pptx-to-markdown`
**Test Files:** `tests/test_presentation.pptx`, `tests/Test_2.pptx`
**Observed Error:**
- When using a local file path, the tool incorrectly treats it as a URL, resulting in a 404 error.
- When using a URL for a `.ppt` file, the tool throws an `UnsupportedFormatException`.

### Diagnosis
- The `toMarkdown` function in `src/Markdownify.ts` does not correctly distinguish between local file paths and URLs.
- The `markitdown` library does not support the `.ppt` format.

### Steps Already Tried
1. Verified that local PPTX files exist and their paths are correct.
2. Tested conversion with local `.pptx` files, which failed.
3. Tested conversion with URLs for `.pptx` files from Harvard and Dickinson, which succeeded.
4. Tested conversion with a URL for a `.ppt` file from UNM, which failed with an `UnsupportedFormatException`.
5. Used Playwright to verify that one of the initial test URLs was broken.

### Suggested Next Steps
- In `src/Markdownify.ts`, refactor the `toMarkdown` function to have separate logic for handling local files and URLs.
- Add a check to validate URLs before fetching them.
- For local files, ensure the path is correctly passed to the `markitdown` script.
- Document that the `.ppt` format is not supported.

---

## 2. Image-to-Markdown Fails to Produce Output

**Tool:** `image-to-markdown`
**Test Files:** `tests/test_image.jpg`, `tests/Test_2.png`, `tests/Test_3.jpg`
**Observed Behavior:** The tool consistently returns an empty output for all tested images.

### Diagnosis
- The issue is not with the input files, as both invalid and valid images have been tested.
- The issue is not a missing Tesseract installation, as it has been verified to be installed and on the system's PATH.
- The issue is not a missing optional dependency, as all optional dependencies for `markitdown` have been installed.
- The problem likely lies in how the `markitdown` library is invoking the Tesseract OCR engine.

### Steps Already Tried
1. Verified that Tesseract is installed and in the system's PATH.
2. Tested with an invalid image file (`Test_2.png`), which was correctly identified as an HTML file.
3. Tested with a valid image file (`Test_3.jpg`), which still resulted in an empty output.
4. Installed all optional dependencies for `markitdown`.

### Suggested Next Steps
- Add verbose logging to the `markitdown` library to inspect the exact command being used to invoke Tesseract.
- Manually run the Tesseract command that `markitdown` is using to see if it produces any errors or output.
- Consider using a different OCR library as a fallback if the Tesseract integration cannot be fixed.

---

## 3. Audio-to-Markdown: "Could not transcribe this audio"

**Tool:** `audio-to-markdown`
**Test Files:** `tests/test_audio.mp3`, `tests/test_audio.wav`, `tests/Test_2.flac`

### Observed Error
- "Could not transcribe this audio"
- `UnsupportedFormatException` for `.flac` files

### Diagnosis
- The Whisper transcription model has not been downloaded, which is the likely cause of the "Could not transcribe this audio" error.
- The `markitdown` library does not support the `.flac` format.

### Steps Already Tried
1. Installed dependencies: `openai-whisper`, `torch`, `torchaudio`.
2. Tried converting MP3, WAV, and FLAC formats.
3. Searched for `.pt` files and confirmed that no Whisper models are present.

### Suggested Next Steps
- Ensure the Whisper model is downloaded before transcription is attempted. This can be done by calling `whisper.load_model("base")` in the `markitdown` library.
- Add support for the `.flac` format to the `markitdown` library.
- Add more specific error handling to the `audio-to-markdown` tool to distinguish between a missing model and an unsupported audio format.

---

## 4. Webpage-to-Markdown Fetch Failed

**Tool:** `webpage-to-markdown`  
**Test URL:** `https://www.example.com`  
**Observed Error:**
```
Error: fetch failed
```

### Diagnosis
- The HTTP fetch request did not succeed.  
- Possible causes:
  - Missing or misconfigured HTTP client (Node `fetch`, `axios`, etc.).  
  - SSL certificate validation issues.  
  - Site blocking requests (user-agent filtering).

### Steps Already Tried
1. Verified network connectivity and URL accessibility in browser.  
2. Ran `markitdown` CLI: `uv run markitdown webpage-to-markdown https://www.example.com`.  
3. Checked for error details—only generic network error.

### Suggested Next Steps
- Use a dedicated HTTP client library with configurable headers (e.g., `node-fetch`, `axios`).  
- Set a realistic `User-Agent` header to mimic a browser.  
- Handle HTTPS certificate errors (`NODE_TLS_REJECT_UNAUTHORIZED=0` for testing).  
- Add retry/backoff logic for transient failures.  
- Log full exception stack and HTTP status codes.

---

## 5. YouTube-to-Markdown Only Footers (No Transcript)

**Tool:** `youtube-to-markdown`  
**Test URL:** `https://www.youtube.com/watch?v=dQw4w9WgXcQ`  

### Observed Behavior
- Only YouTube site footer links are returned; no video transcripts.

### Diagnosis
- Video may not have user-uploaded captions, and auto-generated captions not fetched.  
- The tool’s logic only scrapes transcript if caption track exists.

### Steps Already Tried
1. Tested with this URL (no captions present).  
2. Compared with a known captioned video; that one returns transcripts correctly.

### Suggested Next Steps
- Integrate with YouTube Data API to fetch automatic captions.  
- Add fallback HTML parsing for `ytplayer.config` transcript JSON.  
- Allow user to specify caption language code.  
- Provide a clear error message when no transcript is available.

---

## 6. Bing-Search-to-Markdown Returns Localized Content

**Tool:** `bing-search-to-markdown`  
**Test URL:** `https://www.bing.com/search?q=artificial+intelligence`  

### Observed Behavior
- Search results returned in Chinese (Zhihu links) despite English query.

### Diagnosis
- Default locale/environment variables cause Bing to return localized results.

### Steps Already Tried
1. Ran conversion with default config.  
2. Tried adding `&setlang=en-US` parameter manually in URL.

### Suggested Next Steps
- Expose a configuration option for `searchLocale` and `setlang` in `tools.ts`.  
- Add default query parameters (`mkt=en-US`, `setlang=en-US`).  
- Make locale configurable via MCP request metadata.

---

# Summary & Priorities

| Issue                                         | Status    | Priority |
|-----------------------------------------------|-----------|----------|
| PPTX Conversion Fails                         | Failed    | High     |
| Image-to-Markdown Empty Output                | Failed    | High     |
| Audio-to-Markdown Transcription Failed        | Failed    | High     |
| Webpage-to-Markdown Fetch Error               | Failed    | High     |
| YouTube-to-Markdown Missing Transcript        | Partial   | Medium   |
| Bing-Search-to-Markdown Localized Results     | Partial   | Medium   |
| PDF/DOCX/XLSX Conversion                      | Working   | Low      |

**Next Actions:**  
1. Enable Issues on GitHub or use Discussions/PR for tracking.  
2. Tackle High Priority failures by investigating dependencies, adding logging, and testing alternative libraries.  
3. Address Medium Priority enhancements (locale settings, API fallbacks).  
4. Verify low priority formats remain stable across edge cases.
