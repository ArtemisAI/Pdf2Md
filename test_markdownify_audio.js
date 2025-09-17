#!/usr/bin/env node

import { Markdownify } from "./dist/Markdownify.js";

async function testAudioMarkdownify() {
  const testFile = "tests/audio_samples/github_friendly/test_002_duration_21kb.mp3";
  
  console.log("Testing Markdownify audio conversion...");
  
  try {
    const result = await Markdownify.toMarkdown({
      filePath: testFile,
      uvPath: "uv"
    });
    
    console.log("=== SUCCESS ===");
    console.log("Output file:", result.path);
    console.log("=== CONTENT ===");
    console.log(result.text);
  } catch (error) {
    console.error("Error:", error);
  }
}

testAudioMarkdownify();