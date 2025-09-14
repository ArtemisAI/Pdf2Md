# GitHub Copilot Coding Agent Change Request: Fix Image-to-Markdown OCR Functionality

## 🎯 Request Summary for GitHub Copilot Coding Agent
**Implement working OCR (Optical Character Recognition) for the `image-to-markdown` MCP tool in the Pdf2Md repository**

**Repository**: ArtemisAI/Pdf2Md  
**Branch**: `debug-image-to-markdown`  
**Agent Task**: Fix image text extraction that currently returns empty content

---

## 🌐 GitHub Copilot Cloud Environment Setup

### Step 1: Repository Context
The GitHub Copilot coding agent will work on:
- **Repository**: https://github.com/ArtemisAI/Pdf2Md
- **Branch**: `debug-image-to-markdown` (already created with debugging tools)
- **Language Stack**: TypeScript + Node.js + Python (UV package manager)
- **MCP Framework**: Model Context Protocol server architecture

### Step 2: Cloud Environment Preparation
The coding agent must set up a complete environment including:

#### A. System Dependencies Installation
```bash
# Ubuntu/Debian cloud environment setup
sudo apt-get update
sudo apt-get install -y python3 python3-pip nodejs npm

# Install Tesseract OCR (CRITICAL for image text extraction)
sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
sudo apt-get install -y libtesseract-dev libleptonica-dev

# Verify Tesseract installation
tesseract --version
tesseract --list-langs
```

#### B. UV Package Manager Setup
```bash
# Install UV (Python package manager used by this project)
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env

# Verify UV installation
uv --version
```

#### C. Project Dependencies Installation
```bash
# Clone and setup the repository
git clone https://github.com/ArtemisAI/Pdf2Md.git
cd Pdf2Md
git checkout debug-image-to-markdown

# Install Node.js dependencies
npm install

# Install Python dependencies via UV
uv sync

# Install additional OCR dependencies
uv add pytesseract opencv-python Pillow

# Build TypeScript
npm run build
```

### Step 3: Environment Validation
**CRITICAL**: The agent must verify the environment before implementation:

```bash
# Run the debug script to validate setup
uv run python debug_ocr.py
```

**Expected Output**:
```
✅ PIL (Pillow) is available
✅ pytesseract is available
✅ opencv-python is available
✅ Tesseract executable found
✅ Tesseract version: 4.X.X
✅ Available languages: ['eng', ...]
```

**If any ❌ appears, the agent must fix dependencies before proceeding.**

---

## 🔧 Implementation Requirements

### Problem Analysis
**Current Issue**: The `#mcp_pdf2md_image-to-markdown` tool returns empty content for all images.

**Root Cause**: 
1. `markitdown` library lacks OCR capabilities
2. OCR code in `src/Markdownify.ts` is incomplete/broken
3. Missing proper Tesseract integration

### Technical Requirements

#### 1. Fix OCR Implementation in `src/Markdownify.ts`
**Current broken code location**: Lines ~25-35 in `_performOCR` method

**Key Issues to Fix**:
- Python command execution fails silently
- Path escaping problems on different platforms
- Error handling swallows useful debug information
- No proper validation of OCR results

#### 2. Enhanced Error Handling
- Add comprehensive logging for OCR operations
- Implement graceful fallback to markitdown when OCR fails
- Provide meaningful error messages for configuration issues
- Handle missing Tesseract installation gracefully

#### 3. Image Processing Pipeline
- Support multiple image formats (JPEG, PNG, BMP, TIFF)
- Add image preprocessing for better OCR accuracy
- Implement confidence scoring for OCR results
- Optimize processing for different image sizes

---

## 🧪 Real Image Testing Strategy

### Test Images Available in Repository
The agent must test with these specific images in the repository:

1. **`tests/2.JPG`** (559x940 JPEG) - Contains visible text
2. **`tests/Test_2.png`** - PNG format with text content
3. **`tests/Test_3.jpg`** - JPEG format test image
4. **`logo.jpg`** (1408x768 PNG) - Repository logo with text

### Testing Protocol

#### Phase 1: Validate OCR Dependencies
```bash
# Test 1: Basic OCR functionality
uv run python -c "
from PIL import Image
import pytesseract
img = Image.open('tests/2.JPG')
text = pytesseract.image_to_string(img)
print(f'OCR Test Result: {len(text)} characters extracted')
print(f'Content preview: {text[:100]}')
assert len(text.strip()) > 0, 'OCR must extract text from test image'
"
```

#### Phase 2: Test Enhanced Markdownify Class
```bash
# Test 2: TypeScript OCR integration
npm run build
uv run node -e "
import { Markdownify } from './dist/Markdownify.js';
const result = await Markdownify.toMarkdown({
  filePath: 'tests/2.JPG'
});
console.log('Result length:', result.text.length);
console.log('Content preview:', result.text.substring(0, 200));
"
```

#### Phase 3: End-to-End MCP Testing
```bash
# Test 3: Full MCP server integration
echo '{
  "jsonrpc": "2.0", 
  "id": 1, 
  "method": "tools/call", 
  "params": {
    "name": "image-to-markdown", 
    "arguments": {
      "filepath": "/workspace/Pdf2Md/tests/2.JPG"
    }
  }
}' | node dist/index.js
```

**Expected Success Output**:
```json
{
  "result": {
    "content": [
      {"type": "text", "text": "Output file: /tmp/markdown_output_XXX.md"},
      {"type": "text", "text": "Converted content:"},
      {"type": "text", "text": "# Image Content\n\n[EXTRACTED TEXT FROM IMAGE]\n\n## Metadata\n- Format: JPEG\n- Size: 559x940\n- OCR Method: Tesseract"}
    ],
    "isError": false
  }
}
```

---

## 🎯 Specific Implementation Tasks for Coding Agent

### Task 1: Fix `src/Markdownify.ts` - OCR Method Implementation

**Problem**: Current `_performOCR` method fails silently

**Solution**: Replace with robust implementation:

```typescript
private static async _performOCR(
  filePath: string,
  uvPath: string,
): Promise<string> {
  const expandedUvPath = expandHome(uvPath);
  
  console.log(`🔍 Starting OCR on: ${filePath}`);
  
  // Create a temporary Python script for better error handling
  const pythonScript = `
import sys
import os
from PIL import Image
import pytesseract

try:
    if len(sys.argv) != 2:
        raise ValueError("Usage: python script.py <image_path>")
    
    img_path = sys.argv[1]
    if not os.path.exists(img_path):
        raise FileNotFoundError(f"Image file not found: {img_path}")
    
    # Load and process image
    img = Image.open(img_path)
    
    # OCR with configuration for better accuracy
    custom_config = r'--oem 3 --psm 6'
    text = pytesseract.image_to_string(img, config=custom_config)
    
    # Output results
    print(f"OCR_SUCCESS:{len(text)}")
    print(text)
    
except Exception as e:
    print(f"OCR_ERROR:{str(e)}", file=sys.stderr)
    sys.exit(1)
`;

  // Save script to temporary file
  const scriptPath = path.join(os.tmpdir(), `ocr_script_${Date.now()}.py`);
  fs.writeFileSync(scriptPath, pythonScript);
  
  try {
    console.log(`🐍 Executing: ${expandedUvPath} run python ${scriptPath} "${filePath}"`);
    
    const { stdout, stderr } = await execFileAsync(expandedUvPath, [
      "run",
      "python",
      scriptPath,
      filePath,
    ], { timeout: 30000 }); // 30 second timeout
    
    // Clean up script file
    fs.unlinkSync(scriptPath);
    
    // Parse results
    if (stderr && stderr.includes('OCR_ERROR')) {
      throw new Error(`OCR failed: ${stderr.replace('OCR_ERROR:', '')}`);
    }
    
    if (stdout.includes('OCR_SUCCESS:')) {
      const lines = stdout.split('\n');
      const successLine = lines.find(line => line.startsWith('OCR_SUCCESS:'));
      const textLength = parseInt(successLine.split(':')[1]);
      const extractedText = lines.slice(1).join('\n').trim();
      
      console.log(`✅ OCR completed: ${textLength} characters extracted`);
      return extractedText;
    }
    
    throw new Error('OCR completed but no success marker found');
    
  } catch (error) {
    // Clean up script file on error
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
    
    console.error(`❌ OCR execution failed: ${error.message}`);
    throw error;
  }
}
```

### Task 2: Enhance `_markitdown` Method for Image Detection

**Current Location**: Lines ~20-40 in `src/Markdownify.ts`

**Required Enhancement**:
```typescript
private static async _markitdown(
  filePath: string,
  projectRoot: string,
  uvPath: string,
): Promise<string> {
  // Check if file is an image and try OCR first
  const ext = path.extname(filePath).toLowerCase();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'];
  
  if (imageExtensions.includes(ext)) {
    console.log(`🖼️  Image detected: ${filePath}, attempting OCR...`);
    
    try {
      const ocrResult = await this._performOCR(filePath, uvPath);
      
      if (ocrResult && ocrResult.trim().length > 0) {
        console.log(`✅ OCR successful, extracted ${ocrResult.length} characters`);
        
        // Format as proper markdown with metadata
        const imageStats = await this._getImageStats(filePath);
        const markdown = `# Image Content

## Extracted Text

${ocrResult}

## Image Metadata
- **File**: ${path.basename(filePath)}
- **Format**: ${imageStats.format}
- **Dimensions**: ${imageStats.width}x${imageStats.height}
- **Size**: ${imageStats.fileSize} bytes
- **OCR Engine**: Tesseract
- **Processing Time**: ${new Date().toISOString()}
`;
        
        return markdown;
      }
      
      console.warn(`⚠️  OCR returned empty result for: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️  OCR failed for ${filePath}: ${error.message}`);
      console.log(`🔄 Falling back to markitdown...`);
    }
  }

  // Fallback to original markitdown processing
  const expandedUvPath = expandHome(uvPath);
  console.log(`Executing: ${expandedUvPath} run markitdown ${filePath}`);
  
  const { stdout, stderr } = await execFileAsync(expandedUvPath, [
    "run",
    "markitdown", 
    filePath,
  ]);

  if (stderr && !stderr.includes('ResourceWarning')) {
    throw new Error(`Error executing command: ${stderr}`);
  }

  return stdout;
}
```

### Task 3: Add Image Statistics Helper Method

```typescript
private static async _getImageStats(filePath: string): Promise<{
  format: string;
  width: number; 
  height: number;
  fileSize: number;
}> {
  try {
    const stats = fs.statSync(filePath);
    
    // Use UV to get image dimensions
    const pythonScript = `
from PIL import Image
import sys
img = Image.open(sys.argv[1])
print(f"{img.format}:{img.width}:{img.height}")
`;
    
    const scriptPath = path.join(os.tmpdir(), `img_stats_${Date.now()}.py`);
    fs.writeFileSync(scriptPath, pythonScript);
    
    const { stdout } = await execFileAsync('uv', [
      'run', 'python', scriptPath, filePath
    ]);
    
    fs.unlinkSync(scriptPath);
    
    const [format, width, height] = stdout.trim().split(':');
    
    return {
      format: format || 'Unknown',
      width: parseInt(width) || 0,
      height: parseInt(height) || 0,
      fileSize: stats.size
    };
  } catch (error) {
    console.warn(`Could not get image stats: ${error.message}`);
    return {
      format: 'Unknown',
      width: 0,
      height: 0, 
      fileSize: 0
    };
  }
}
```

### Task 4: Update Tool Description in `src/tools.ts`

**Enhancement Required**:
```typescript
export const ImageToMarkdownTool = ToolSchema.parse({
  name: "image-to-markdown",
  description: "Convert an image to markdown using OCR (Optical Character Recognition) to extract text content. Supports JPEG, PNG, BMP, TIFF, WebP formats. Returns extracted text with image metadata and processing details.",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Absolute path of the image file to convert (supports: .jpg, .jpeg, .png, .bmp, .tiff, .webp)",
      },
      uvPath: {
        type: "string", 
        description: "Path to the uv executable (optional, defaults to 'uv')",
      },
    },
    required: ["filepath"],
  },
});
```

---

## 🧪 Automated Testing Implementation

### Create `tests/test_image_ocr_integration.js`

```javascript
import { Markdownify } from '../dist/Markdownify.js';
import assert from 'assert';
import path from 'path';
import fs from 'fs';

async function testImageOCRIntegration() {
  console.log('🧪 Starting Image-to-Markdown OCR Integration Tests');
  
  const testImages = [
    { path: 'tests/2.JPG', expectText: true, minLength: 10 },
    { path: 'tests/Test_2.png', expectText: true, minLength: 5 },
    { path: 'tests/Test_3.jpg', expectText: true, minLength: 5 },
    { path: 'logo.jpg', expectText: false, minLength: 0 } // May not have extractable text
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testImage of testImages) {
    console.log(`\n📸 Testing: ${testImage.path}`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(testImage.path)) {
        console.log(`⚠️  Skipping ${testImage.path} - file not found`);
        continue;
      }
      
      // Run OCR conversion
      const startTime = Date.now();
      const result = await Markdownify.toMarkdown({
        filePath: path.resolve(testImage.path)
      });
      const processingTime = Date.now() - startTime;
      
      console.log(`📊 Results for ${testImage.path}:`);
      console.log(`   • Content length: ${result.text.length} characters`);
      console.log(`   • Processing time: ${processingTime}ms`);
      console.log(`   • Content preview: ${result.text.substring(0, 100).replace(/\n/g, '\\n')}`);
      
      // Validate results
      if (testImage.expectText) {
        assert(result.text.length >= testImage.minLength, 
               `Expected at least ${testImage.minLength} characters, got ${result.text.length}`);
        assert(result.text.includes('#'), 
               'Result should contain markdown headers');
        assert(result.text.includes('Image'), 
               'Result should reference image content');
      }
      
      // Performance validation
      assert(processingTime < 30000, 
             `Processing took too long: ${processingTime}ms (max 30s)`);
      
      console.log(`✅ PASSED: ${testImage.path}`);
      passed++;
      
    } catch (error) {
      console.error(`❌ FAILED: ${testImage.path} - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📈 Test Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

testImageOCRIntegration().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
```

### Create `tests/test_mcp_image_e2e.js`

```javascript
import { spawn } from 'child_process';
import assert from 'assert';

async function testMCPImageEndToEnd() {
  console.log('🔗 Starting End-to-End MCP Image-to-Markdown Test');
  
  return new Promise((resolve, reject) => {
    // Start MCP server
    const server = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    server.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Wait for server to initialize
    setTimeout(() => {
      // Send test request
      const testRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'image-to-markdown',
          arguments: {
            filepath: path.resolve('tests/2.JPG')
          }
        }
      };
      
      server.stdin.write(JSON.stringify(testRequest) + '\n');
      
      // Wait for response
      setTimeout(() => {
        server.kill();
        
        console.log('📤 Request sent:', JSON.stringify(testRequest, null, 2));
        console.log('📥 Server stdout:', stdout);
        
        if (stderr) {
          console.log('⚠️  Server stderr:', stderr);
        }
        
        // Validate response
        try {
          assert(stdout.includes('image-to-markdown'), 'Response should reference image-to-markdown');
          assert(stdout.includes('result'), 'Response should contain result field');
          assert(!stdout.includes('isError":true'), 'Response should not contain errors');
          
          console.log('✅ End-to-End MCP test PASSED');
          resolve(true);
        } catch (error) {
          console.error('❌ End-to-End MCP test FAILED:', error.message);
          reject(error);
        }
      }, 5000);
    }, 2000);
    
    server.on('error', reject);
  });
}

testMCPImageEndToEnd().catch(error => {
  console.error('E2E test failed:', error);
  process.exit(1);
});
```

---

## 🏃‍♂️ CI/CD Integration for GitHub Actions

### Create `.github/workflows/test-image-ocr.yml`

```yaml
name: Test Image-to-Markdown OCR

on:
  push:
    branches: [ debug-image-to-markdown ]
  pull_request:
    branches: [ main ]

jobs:
  test-ocr:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install system dependencies
      run: |
        sudo apt-get update
        sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
        sudo apt-get install -y libtesseract-dev libleptonica-dev
        
    - name: Verify Tesseract installation
      run: |
        tesseract --version
        tesseract --list-langs
        
    - name: Install UV
      run: |
        curl -LsSf https://astral.sh/uv/install.sh | sh
        source $HOME/.cargo/env
        echo "$HOME/.cargo/bin" >> $GITHUB_PATH
        
    - name: Install dependencies
      run: |
        npm install
        uv sync
        uv add pytesseract opencv-python Pillow
        
    - name: Build project
      run: npm run build
      
    - name: Run OCR dependency tests
      run: uv run python debug_ocr.py
      
    - name: Run integration tests
      run: |
        node tests/test_image_ocr_integration.js
        node tests/test_mcp_image_e2e.js
        
    - name: Test MCP server directly
      run: |
        timeout 10s node dist/index.js &
        SERVER_PID=$!
        sleep 3
        echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | nc localhost 3000 || true
        kill $SERVER_PID || true
```

---

## 📋 Success Criteria & Validation

### Functional Requirements ✅
1. **OCR Text Extraction**: ✅ Images with text return non-empty markdown
2. **Format Support**: ✅ JPEG, PNG, BMP, TIFF formats work  
3. **Graceful Fallback**: ✅ Falls back to markitdown when OCR fails
4. **Error Handling**: ✅ Meaningful errors for missing dependencies
5. **Performance**: ✅ Processing completes within 30 seconds

### Quality Requirements ✅  
1. **Comprehensive Logging**: ✅ OCR operations are fully logged
2. **Documentation**: ✅ Tool descriptions updated with OCR capabilities
3. **Automated Testing**: ✅ Test suite validates OCR functionality
4. **CI/CD Integration**: ✅ GitHub Actions workflow for validation

### Final Validation Commands

```bash
# 1. Environment validation
uv run python debug_ocr.py

# 2. Build and basic functionality
npm run build
node tests/test_image_ocr_integration.js

# 3. End-to-end MCP testing
node tests/test_mcp_image_e2e.js

# 4. Manual MCP call test
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "image-to-markdown", "arguments": {"filepath": "tests/2.JPG"}}}' | node dist/index.js
```

**Expected Final Output**: Images return structured markdown with extracted text, metadata, and processing information.

---

## 🚀 GitHub Copilot Coding Agent Execution Plan

### Phase 1: Environment Setup (5 minutes)
1. Install system dependencies (Tesseract OCR)
2. Install UV package manager  
3. Clone repository and checkout debug branch
4. Install Node.js and Python dependencies
5. Validate environment with debug script

### Phase 2: Core Implementation (15 minutes)
1. Fix `_performOCR` method in `src/Markdownify.ts`
2. Enhance `_markitdown` method for image detection
3. Add `_getImageStats` helper method
4. Update tool description in `src/tools.ts`
5. Build and validate TypeScript compilation

### Phase 3: Testing Implementation (10 minutes)
1. Create comprehensive test suite files
2. Run integration tests on real images
3. Validate end-to-end MCP functionality
4. Create GitHub Actions workflow
5. Document any issues or limitations

### Phase 4: Validation & Documentation (5 minutes)
1. Run full test suite and validate results
2. Update README with OCR setup instructions  
3. Create pull request with comprehensive changes
4. Document performance metrics and capabilities

**Total Estimated Time**: 35 minutes for complete implementation and validation.

---

This comprehensive change request provides GitHub Copilot coding agent with everything needed to implement working OCR functionality for the image-to-markdown tool, including cloud environment setup, real image testing, and complete validation procedures.
