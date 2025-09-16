import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import { expandHome } from "./utils.js";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type MarkdownResult = {
  path: string;
  text: string;
};

export class Markdownify {
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
        if (!successLine) {
          throw new Error('OCR success marker found but line not parsed correctly');
        }
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
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ OCR execution failed: ${errorMessage}`);
      throw error;
    }
  }

  private static async _getImageStats(filePath: string, uvPath: string): Promise<{
    format: string;
    width: number; 
    height: number;
    fileSize: number;
  }> {
    try {
      const stats = fs.statSync(filePath);
      const expandedUvPath = expandHome(uvPath);
      
      // Use UV to get image dimensions
      const pythonScript = `
from PIL import Image
import sys
img = Image.open(sys.argv[1])
print(f"{img.format}:{img.width}:{img.height}")
`;
      
      const scriptPath = path.join(os.tmpdir(), `img_stats_${Date.now()}.py`);
      fs.writeFileSync(scriptPath, pythonScript);
      
      const { stdout } = await execFileAsync(expandedUvPath, [
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Could not get image stats: ${errorMessage}`);
      return {
        format: 'Unknown',
        width: 0,
        height: 0, 
        fileSize: 0
      };
    }
  }

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
          const imageStats = await this._getImageStats(filePath, uvPath);
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️  OCR failed for ${filePath}: ${errorMessage}`);
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

  private static async saveToTempFile(
    content: string | Buffer,
    suggestedExtension?: string | null,
  ): Promise<string> {
    let outputExtension = "md";
    if (suggestedExtension != null) {
      outputExtension = suggestedExtension;
    }

    const tempOutputPath = path.join(
      os.tmpdir(),
      `markdown_output_${Date.now()}.${outputExtension}`,
    );
    fs.writeFileSync(tempOutputPath, content);
    return tempOutputPath;
  }

  private static normalizePath(p: string): string {
    return path.normalize(p);
  }

  static async toMarkdown({
    filePath,
    url,
    projectRoot = path.resolve(__dirname, ".."),
  uvPath = "uv",
  }: {
    filePath?: string;
    url?: string;
    projectRoot?: string;
    uvPath?: string;
  }): Promise<MarkdownResult> {
    console.log(`toMarkdown called with: filePath=${filePath}, url=${url}`);
    try {
      let inputPath: string;
      let isTemporary = false;

      if (url) {
        const response = await fetch(url);

        let extension = null;

        if (url.endsWith(".pdf")) {
          extension = "pdf";
        }

        const arrayBuffer = await response.arrayBuffer();
        const content = Buffer.from(arrayBuffer);

        inputPath = await this.saveToTempFile(content, extension);
        isTemporary = true;
      } else if (filePath) {
        inputPath = this.normalizePath(filePath);
      } else {
        throw new Error("Either filePath or url must be provided");
      }

      const text = await this._markitdown(inputPath, projectRoot, uvPath);
      const outputPath = await this.saveToTempFile(text);

      if (isTemporary) {
        fs.unlinkSync(inputPath);
      }

      return { path: outputPath, text };
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new Error(`Error processing to Markdown: ${e.message}`);
      } else {
        throw new Error("Error processing to Markdown: Unknown error occurred");
      }
    }
  }

  static async get({
    filePath,
  }: {
    filePath: string;
  }): Promise<MarkdownResult> {
    // Check file type is *.md or *.markdown
    const normPath = this.normalizePath(path.resolve(expandHome(filePath)));
    const markdownExt = [".md", ".markdown"];
    if (!markdownExt.includes(path.extname(normPath))) {
      throw new Error("Required file is not a Markdown file.");
    }

    if (process.env?.MD_SHARE_DIR) {
      const allowedShareDir = this.normalizePath(
        path.resolve(expandHome(process.env.MD_SHARE_DIR)),
      );
      if (!normPath.startsWith(allowedShareDir)) {
        throw new Error(`Only files in ${allowedShareDir} are allowed.`);
      }
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist");
    }

    const text = await fs.promises.readFile(filePath, "utf-8");

    return {
      path: filePath,
      text: text,
    };
  }
}
