# Hugging Face Models for Wardrobe Analysis

## Available Models

You can now choose between two FREE Hugging Face models for wardrobe image analysis:

### 1. BLIP (Default)
- **Model**: `Salesforce/blip-image-captioning-base`
- **Best for**: Detailed, descriptive captions
- **Size**: ~990 MB
- **Speed**: Moderate

### 2. ViT-GPT2 Image Captioning
- **Model**: `nlpconnect/vit-gpt2-image-captioning`
- **Best for**: Fast, concise captions
- **Size**: ~500 MB
- **Speed**: Faster than BLIP

## Configuration

### Switch to ViT-GPT2 Model

Add to your `.env` file:

```bash
# Use Hugging Face instead of OpenAI
WARDROBE_AI_MODEL=huggingface

# Choose model: "blip" or "vit-gpt2"
HUGGINGFACE_MODEL_TYPE=vit-gpt2

# Optional: For Inference API (faster, 1000 requests/month free)
# HUGGINGFACE_API_TOKEN=your_token_here
```

### Switch Back to BLIP

```bash
HUGGINGFACE_MODEL_TYPE=blip
```

## Model Comparison

| Feature | BLIP | ViT-GPT2 |
|---------|------|----------|
| **Caption Quality** | More detailed | Concise |
| **Model Size** | ~990 MB | ~500 MB |
| **Speed** | Moderate | Faster |
| **Best For** | Detailed descriptions | Quick analysis |

## Usage

1. Set `HUGGINGFACE_MODEL_TYPE` in `.env`
2. Restart backend
3. Upload wardrobe images - the model name will appear in the success message:
   - "Hugging Face BLIP (Local)" or "Hugging Face BLIP (Inference API)"
   - "Hugging Face ViT-GPT2 Image Captioning (Local)" or "Hugging Face ViT-GPT2 Image Captioning (Inference API)"

## First Time Setup

When you first use a model, it will download automatically:
- **BLIP**: ~990 MB download
- **ViT-GPT2**: ~500 MB download

After the first download, models are cached locally and load instantly.

## Switching Models

You can switch between models anytime by changing `HUGGINGFACE_MODEL_TYPE` in `.env` and restarting the backend.



