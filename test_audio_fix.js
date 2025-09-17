#!/usr/bin/env node

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function testAudioConversion() {
  const testFile = "tests/audio_samples/github_friendly/test_002_duration_21kb.mp3";
  
  console.log("Testing audio conversion...");
  
  try {
    // Test the audio transcription directly
    const { stdout, stderr } = await execFileAsync("node", [
      "dist/index.js"
    ], {
      input: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "audio-to-markdown",
          arguments: {
            filepath: testFile
          }
        }
      }) + "\n",
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`
      }
    });
    
    console.log("=== STDOUT ===");
    console.log(stdout);
    console.log("=== STDERR ===");  
    console.log(stderr);
  } catch (error) {
    console.error("Error:", error);
  }
}

testAudioConversion();