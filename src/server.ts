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
import { transcribeAudio, getTaskStatus, getTranscriptionResult, ConfigManager, ProgressReporter } from "./audio/index.js";
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

          case tools.EnhancedAudioToMarkdownTool.name: {
            const enhancedArgs = EnhancedAudioRequestSchema.parse(args);
            
            if (!enhancedArgs.filepath) {
              throw new Error("File path is required for enhanced audio transcription");
            }

            if (enhancedArgs.asyncMode) {
              // Async mode: start transcription and return task ID
              const taskId = await transcribeAudio({
                filepath: enhancedArgs.filepath,
                language: enhancedArgs.language,
                config: {
                  modelSize: enhancedArgs.modelSize || 'medium',
                  device: enhancedArgs.device || 'auto',
                },
                uvPath: enhancedArgs.uvPath || process.env.UV_PATH,
              });

              return {
                content: [
                  { type: "text", text: `Async transcription started` },
                  { type: "text", text: `Task ID: ${taskId}` },
                  { type: "text", text: `Use the audio-transcription-status tool to check progress` },
                ],
                isError: false,
              };
            } else {
              // Sync mode: Try GPU acceleration first, fall back to markitdown
              try {
                const { detectGPU } = await import('./utils.js');
                const gpuInfo = await detectGPU(enhancedArgs.uvPath || process.env.UV_PATH);
                
                if (gpuInfo.available) {
                  // Use GPU acceleration
                  const { EnhancedAudioTranscription } = await import('./audio/EnhancedAudioTranscription.js');
                  const transcriber = new EnhancedAudioTranscription({
                    modelSize: enhancedArgs.modelSize || 'tiny',
                    device: enhancedArgs.device || 'auto'
                  });
                  
                  const transcriptionResult = await transcriber.transcribe({
                    filepath: enhancedArgs.filepath,
                    language: enhancedArgs.language,
                    uvPath: enhancedArgs.uvPath || process.env.UV_PATH
                  });
                  
                  const outputPath = await saveToTempFile(transcriptionResult.text);
                  
                  return {
                    content: [
                      { type: "text", text: `Enhanced GPU audio transcription completed` },
                      { type: "text", text: `Output file: ${outputPath}` },
                      { type: "text", text: `Device: ${transcriptionResult.device || 'GPU'}` },
                      { type: "text", text: `Performance: ${transcriptionResult.real_time_factor ? transcriptionResult.real_time_factor.toFixed(1) + 'x real-time' : 'optimized'}` },
                      { type: "text", text: `Transcribed content:` },
                      { type: "text", text: transcriptionResult.text },
                    ],
                    isError: false,
                  };
                }
              } catch (error) {
                console.warn('GPU transcription failed, falling back to markitdown:', error instanceof Error ? error.message : 'Unknown error');
              }
              
              // Fallback to regular markitdown
              const result = await Markdownify.toMarkdown({
                filePath: enhancedArgs.filepath,
                projectRoot: validatedArgs.projectRoot,
                uvPath: enhancedArgs.uvPath || process.env.UV_PATH,
              });

              return {
                content: [
                  { type: "text", text: `Audio transcription completed (CPU fallback)` },
                  { type: "text", text: `Output file: ${result.path}` },
                  { type: "text", text: `Note: GPU acceleration unavailable, used markitdown fallback` },
                  { type: "text", text: `Transcribed content:` },
                  { type: "text", text: result.text },
                ],
                isError: false,
              };
            }
          }

          case tools.AudioTranscriptionStatusTool.name: {
            const statusArgs = TaskStatusRequestSchema.parse(args);
            
            if (!statusArgs.taskId) {
              throw new Error("Task ID is required for status check");
            }

            const task = await getTaskStatus(statusArgs.taskId);
            
            if (!task) {
              return {
                content: [
                  { type: "text", text: `Task not found: ${statusArgs.taskId}` },
                ],
                isError: true,
              };
            }

            const content = [
              { type: "text", text: `Task Status: ${task.status}` },
              { type: "text", text: `Progress: ${task.progress}%` },
              { type: "text", text: `Created: ${task.createdAt.toISOString()}` },
            ];

            if (task.status === 'completed' && task.result) {
              const result = getTranscriptionResult(statusArgs.taskId);
              if (result) {
                content.push(
                  { type: "text", text: `Output file: ${result.path}` },
                  { type: "text", text: `Language: ${result.language || 'auto-detected'}` },
                  { type: "text", text: `Duration: ${result.duration ? Math.round(result.duration) + 's' : 'unknown'}` },
                  { type: "text", text: `Confidence: ${result.confidence ? Math.round(result.confidence * 100) + '%' : 'unknown'}` },
                  { type: "text", text: `Transcribed content:` },
                  { type: "text", text: result.text }
                );
              }
            }

            if (task.status === 'failed' && task.error) {
              content.push({ type: "text", text: `Error: ${task.error}` });
            }

            return {
              content,
              isError: task.status === 'failed',
            };
          }

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
