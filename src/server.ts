import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Markdownify } from "./Markdownify.js";
import * as tools from "./tools.js";
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import is_ip_private from "private-ip";
import { URL } from "node:url";
import { transcribeAudio, getTaskStatus, ConfigManager, ProgressReporter } from "./audio/index.js";
import { saveToTempFile } from "./utils.js";

const RequestPayloadSchema = z.object({
  filepath: z.string().optional(),
  url: z.string().optional(),
  projectRoot: z.string().optional(),
  uvPath: z.string().optional(),
});

const EnhancedAudioRequestSchema = z.object({
  filepath: z.string(),
  language: z.string().optional(),
  modelSize: z.enum(["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"]).optional(),
  device: z.enum(["auto", "cpu", "cuda", "cuda:0"]).optional(),
  asyncMode: z.boolean().optional(),
  uvPath: z.string().optional(),
});

const TaskStatusRequestSchema = z.object({
  taskId: z.string(),
});

export function createServer() {
  const server = new Server(
    {
      name: "mcp-markdownify-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.values(tools),
    };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      const validatedArgs = RequestPayloadSchema.parse(args);

      try {
        let result;
        switch (name) {
          case tools.YouTubeToMarkdownTool.name:
          case tools.BingSearchResultToMarkdownTool.name:
          case tools.WebpageToMarkdownTool.name:
            if (!validatedArgs.url) {
              throw new Error("URL is required for this tool");
            }     
            
            const parsedUrl = new URL(validatedArgs.url);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) {
              throw new Error("Only http: and https: schemes are allowed.");
            }
            
            if (is_ip_private(parsedUrl.hostname)) {
              throw new Error(`Fetching ${validatedArgs.url} is potentially dangerous, aborting.`);
            }
    
            result = await Markdownify.toMarkdown({
              url: validatedArgs.url,
              projectRoot: validatedArgs.projectRoot,
              uvPath: validatedArgs.uvPath || process.env.UV_PATH,
            });
            break;

          case tools.PDFToMarkdownTool.name:
          case tools.ImageToMarkdownTool.name:
          case tools.AudioToMarkdownTool.name:
          case tools.DocxToMarkdownTool.name:
          case tools.XlsxToMarkdownTool.name:
          case tools.PptxToMarkdownTool.name:
            if (!validatedArgs.filepath) {
              throw new Error("File path is required for this tool");
            }
            result = await Markdownify.toMarkdown({
              filePath: validatedArgs.filepath,
              projectRoot: validatedArgs.projectRoot,
              uvPath: validatedArgs.uvPath || process.env.UV_PATH,
            });
            break;

          case tools.EnhancedAudioToMarkdownTool.name:
            {
              const audioArgs = EnhancedAudioRequestSchema.parse(args);
              
              if (audioArgs.asyncMode) {
                // Asynchronous mode - return task ID
                const taskId = await transcribeAudio({
                  filepath: audioArgs.filepath,
                  language: audioArgs.language,
                  config: {
                    modelSize: audioArgs.modelSize,
                    device: audioArgs.device,
                  },
                  uvPath: audioArgs.uvPath || process.env.UV_PATH,
                });
                
                return {
                  content: [
                    { type: "text", text: `Enhanced audio transcription started` },
                    { type: "text", text: `Task ID: ${taskId}` },
                    { type: "text", text: `Use audio-transcription-status tool to check progress` },
                  ],
                  isError: false,
                };
              } else {
                // Synchronous mode - wait for completion
                const { EnhancedAudioTranscription } = await import("./audio/EnhancedAudioTranscription.js");
                const transcription = new EnhancedAudioTranscription({
                  modelSize: audioArgs.modelSize,
                  device: audioArgs.device,
                });
                
                const transcriptionResult = await transcription.transcribe({
                  filepath: audioArgs.filepath,
                  language: audioArgs.language,
                  uvPath: audioArgs.uvPath || process.env.UV_PATH,
                });
                
                // Save result to markdown file
                const markdownContent = `# Audio Transcription

**File:** ${audioArgs.filepath}
**Language:** ${transcriptionResult.language || 'auto-detected'}
**Duration:** ${transcriptionResult.duration ? `${transcriptionResult.duration.toFixed(1)}s` : 'unknown'}

## Transcript

${transcriptionResult.text}
`;
                
                const outputPath = await saveToTempFile(markdownContent);
                
                result = {
                  path: outputPath,
                  text: markdownContent
                };
              }
            }
            break;

          case tools.AudioTranscriptionStatusTool.name:
            {
              const statusArgs = TaskStatusRequestSchema.parse(args);
              const task = getTaskStatus(statusArgs.taskId);
              
              if (!task) {
                return {
                  content: [{ type: "text", text: `Task not found: ${statusArgs.taskId}` }],
                  isError: true,
                };
              }
              
              let statusText = `**Task ID:** ${task.id}
**Status:** ${task.status}
**Progress:** ${task.progress}%
**File:** ${task.filePath}
**Language:** ${task.language}
**Created:** ${task.createdAt.toISOString()}`;

              if (task.completedAt) {
                statusText += `\n**Completed:** ${task.completedAt.toISOString()}`;
              }
              
              if (task.error) {
                statusText += `\n**Error:** ${task.error}`;
              }
              
              if (task.result && task.status === 'completed') {
                const markdownContent = `# Audio Transcription Result

${statusText}

## Transcript

${task.result}
`;
                
                const outputPath = await saveToTempFile(markdownContent);
                
                return {
                  content: [
                    { type: "text", text: `Output file: ${outputPath}` },
                    { type: "text", text: `Task completed successfully` },
                    { type: "text", text: markdownContent },
                  ],
                  isError: false,
                };
              }
              
              return {
                content: [
                  { type: "text", text: statusText },
                ],
                isError: task.status === 'failed',
              };
            }
            break;

          case tools.GetMarkdownFileTool.name:
            if (!validatedArgs.filepath) {
              throw new Error("File path is required for this tool");
            }
            result = await Markdownify.get({
              filePath: validatedArgs.filepath,
            });
            break;

          default:
            throw new Error("Tool not found");
        }

        return {
          content: [
            { type: "text", text: `Output file: ${result.path}` },
            { type: "text", text: `Converted content:` },
            { type: "text", text: result.text },
          ],
          isError: false,
        };
      } catch (e) {
        if (e instanceof Error) {
          return {
            content: [{ type: "text", text: `Error: ${e.message}` }],
            isError: true,
          };
        } else {
          console.error(e);
          return {
            content: [{ type: "text", text: `Error: Unknown error occurred` }],
            isError: true,
          };
        }
      }
    },
  );

  return server;
}
