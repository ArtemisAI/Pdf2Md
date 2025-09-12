import path from "path";
import os from "os";
import fs from "fs";

export function expandHome(filepath: string): string {
  if (filepath.startsWith("~/") || filepath === "~") {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export async function saveToTempFile(
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
  await fs.promises.writeFile(tempOutputPath, content);
  return tempOutputPath;
}
