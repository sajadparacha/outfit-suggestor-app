# Hugging Face Integration for Wardrobe Analysis (FREE)

## Overview

This guide shows you how to use **FREE** Hugging Face models instead of paid OpenAI GPT-4o for wardrobe image analysis.

## Two Options

### Option 1: Hugging Face Inference API (Easiest - FREE tier)
- **Free tier**: 1,000 requests/month
- **No setup required** - just need an API token
- **Models**: BLIP, ViT, and more
- **Get token**: https://huggingface.co/settings/tokens

### Option 2: Local Models (Completely FREE)
- **Unlimited requests**
- **Requires**: Python, transformers library, ~2GB disk space
- **Models**: Runs locally on your server

## Setup Instructions

### Step 1: Choose Your Model

Add to your `.env` file:

```bash
# Use Hugging Face instead of OpenAI
WARDROBE_AI_MODEL=huggingface

# Optional: For Inference API (free tier: 1000 requests/month)
# Get token from: https://huggingface.co/settings/tokens
HUGGINGFACE_API_TOKEN=your_token_here

# If HUGGINGFACE_API_TOKEN is not set, will use local models
```

### Step 2: Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install transformers torch pillow
```

**Note**: `torch` is large (~2GB). If you have a GPU, install CUDA version for faster inference.

### Step 3: Restart Backend

```bash
python main.py
```

You should see:
```
✅ Using Hugging Face (FREE) for wardrobe analysis
```

## How It Works

1. **Image Upload** → User uploads clothing photo
2. **BLIP Model** → Generates image caption (e.g., "a blue shirt with buttons")
3. **Parser** → Extracts:
   - Category (shirt, trouser, etc.)
   - Color (blue, navy, etc.)
   - Description (style, fit, pattern)

## Models Used

- **BLIP (Salesforce/blip-image-captioning-base)**: Generates descriptions
- **ViT (google/vit-base-patch16-224)**: Classification (optional, for future enhancement)

## Cost Comparison

| Model | Cost | Requests |
|-------|------|----------|
| OpenAI GPT-4o | ~$0.01-0.05 per image | Unlimited (paid) |
| Hugging Face Inference API | FREE | 1,000/month (free tier) |
| Hugging Face Local | FREE | Unlimited |

## Switching Back to OpenAI

Just change in `.env`:
```bash
WARDROBE_AI_MODEL=openai
```

## Troubleshooting

### "transformers library not installed"
```bash
pip install transformers torch pillow
```

### "Model loading is slow"
- First load takes time (~1-2 minutes)
- Subsequent requests are fast
- Consider using Inference API for faster startup

### "Out of memory"
- BLIP model needs ~2GB RAM
- Use Inference API instead (runs on Hugging Face servers)

## Future Enhancements

1. **Fine-tune on fashion dataset** - Better accuracy for clothing
2. **Multi-model ensemble** - Combine BLIP + ViT for better results
3. **Caching** - Cache model in memory for faster responses
4. **Batch processing** - Process multiple images at once

## Example Output

**Input**: Image of a blue shirt

**Output**:
```json
{
  "category": "shirt",
  "color": "Blue",
  "description": "Blue shirt with buttons. Style: casual, classic"
}
```

## Resources

- Hugging Face Models: https://huggingface.co/models
- BLIP Model: https://huggingface.co/Salesforce/blip-image-captioning-base
- Inference API Docs: https://huggingface.co/docs/api-inference



