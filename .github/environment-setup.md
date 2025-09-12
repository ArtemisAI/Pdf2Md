# GitHub Repository Environment Configuration

## GitHub Copilot Environment Setup

To enable GitHub Copilot coding agent to work optimally with the Pdf2Md MCP server, configure the following environment variables in your GitHub repository:

### 1. Repository Settings Configuration

Navigate to **Settings** → **Environments** → **copilot** and add:

#### Environment Variables
```bash
# Core Configuration
NODE_ENV=development
UV_PATH=uv
MCP_SERVER_NAME=Pdf2Md

# GPU Acceleration Settings
KMP_DUPLICATE_LIB_OK=TRUE
OMP_NUM_THREADS=4
CUDA_VISIBLE_DEVICES=0

# Performance Configuration  
WHISPER_MODEL_SIZE=medium
WHISPER_BATCH_SIZE=8
WHISPER_DEVICE=auto
WHISPER_DEFAULT_LANGUAGE=en

# Development Settings
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
TOKENIZERS_PARALLELISM=false
```

#### Environment Secrets (if needed)
```bash
# Optional: For private model access
HUGGINGFACE_TOKEN=[your-token-here]
```

### 2. Deployment Protection Rules

Configure the `copilot` environment with:
- **Required reviewers**: Optional (for production deployments)
- **Wait timer**: 0 minutes (for development)
- **Deployment branches**: `AUDIO` branch and `main`

### 3. GitHub Actions Integration

The environment variables are automatically available in:
- `copilot-setup-steps.yml` workflow
- GitHub Copilot coding agent sessions
- All automated testing workflows

### 4. MCP Server Configuration

The `.vscode/mcp.json` file includes environment variables for local development:
```json
{
  "servers": {
    "Pdf2Md": {
      "env": {
        "KMP_DUPLICATE_LIB_OK": "TRUE",
        "OMP_NUM_THREADS": "4",
        "UV_PATH": "uv",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 5. Verification Commands

To verify the environment is properly configured:

```bash
# Check environment variables are loaded
echo $KMP_DUPLICATE_LIB_OK
echo $UV_PATH

# Test GPU detection
uv run python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"

# Test MCP server startup
node dist/index.js
```

## Security Notes

- Environment variables are securely managed through GitHub's environment system
- Sensitive data should use GitHub Secrets rather than variables
- The `copilot` environment is isolated and only accessible during Copilot sessions
- All environment variables are automatically sanitized in logs

## Troubleshooting

### Common Issues
1. **OpenMP Conflicts**: Ensure `KMP_DUPLICATE_LIB_OK=TRUE` is set
2. **UV Path Issues**: Verify `UV_PATH=uv` points to correct executable
3. **CUDA Availability**: Check CUDA drivers and `CUDA_VISIBLE_DEVICES` setting
4. **Model Loading**: Verify internet connectivity for Hugging Face model downloads

### Environment Validation
Run the complete validation suite:
```bash
# GitHub Actions validation
.github/workflows/copilot-setup-steps.yml

# Local validation
pnpm run build
uv run python tests/gpu_acceleration/test_gpu_final.py
node tests/test_enhanced_audio.js
```

This configuration ensures GitHub Copilot has complete access to the GPU-accelerated audio transcription environment and can develop autonomously with full context.
