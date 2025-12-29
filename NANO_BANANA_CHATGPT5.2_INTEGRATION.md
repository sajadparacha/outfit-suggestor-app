# Nano Banana & ChatGPT 5.2 Integration

This document describes the integration of Nano Banana and ChatGPT 5.2 into the Outfit Suggestor application.

## Changes Made

### Backend Changes

#### 1. Configuration (`backend/config.py`)
- Added `NANO_BANANA_API_KEY` environment variable for Nano Banana API authentication
- Added `CHATGPT_MODEL` environment variable (defaults to "gpt-4o", can be set to "gpt-5.2" when available)
- Updated `get_ai_service()` to pass `nano_banana_key` and `chatgpt_model` to `AIService`

#### 2. AI Service (`backend/services/ai_service.py`)
- Updated `AIService.__init__()` to accept:
  - `nano_banana_key`: Optional API key for Nano Banana
  - `chatgpt_model`: Configurable ChatGPT model version
- Added `_generate_with_nano_banana()` method for Nano Banana image generation
- Added `_build_nano_banana_prompt()` method for building Nano Banana prompts
- Updated `generate_model_image()` to support `"nano-banana"` as a model option
- The service now uses the configured `chatgpt_model` for outfit suggestions (automatically uses ChatGPT 5.2 when configured)

#### 3. Outfit Controller (`backend/controllers/outfit_controller.py`)
- Updated model validation to accept `"nano-banana"` as a valid model option
- Added fallback to DALL-E 3 if Nano Banana fails (same as Stable Diffusion)

### Frontend Changes

#### 1. Sidebar Component (`frontend/src/views/components/Sidebar.tsx`)
- Added "Nano Banana (Advanced Image-to-Image)" option to the image generation model dropdown
- Updated model descriptions to include Nano Banana information

#### 2. API Service (`frontend/src/services/ApiService.ts`)
- Already supports passing `imageModel` parameter (no changes needed)

## Environment Variables

Add the following to your `.env` file:

```bash
# Nano Banana API Key (for image generation)
NANO_BANANA_API_KEY=your_nano_banana_api_key_here

# ChatGPT Model Version (for outfit suggestions)
# Options: "gpt-4o" (default) or "gpt-5.2" (when available)
CHATGPT_MODEL=gpt-4o
```

## Usage

### Nano Banana Image Generation

1. Set `NANO_BANANA_API_KEY` in your `.env` file
2. In the frontend, enable "Generate Model Image" toggle
3. Select "Nano Banana (Advanced Image-to-Image)" from the model dropdown
4. Upload an image and get suggestions

### ChatGPT 5.2 for Outfit Suggestions

1. Set `CHATGPT_MODEL=gpt-5.2` in your `.env` file (when GPT-5.2 becomes available)
2. The application will automatically use ChatGPT 5.2 for all outfit suggestions
3. No frontend changes needed - this is a backend configuration

## API Endpoints

No changes to API endpoints - the existing `/api/suggest-outfit` endpoint now accepts `"nano-banana"` as a valid `image_model` value.

## Error Handling

- If Nano Banana API key is not set, the service will return a clear error message
- If Nano Banana generation fails, the system automatically falls back to DALL-E 3
- If ChatGPT 5.2 is not available, the system will use the default model (gpt-4o)

## Notes

- **Nano Banana**: Used for image generation. Supports image-to-image generation which can better preserve uploaded clothing details.
- **ChatGPT 5.2**: Used for outfit suggestions (text analysis). Configured via environment variable, not user-selectable in the UI.

## Testing

1. Test Nano Banana integration:
   - Set `NANO_BANANA_API_KEY` in `.env`
   - Select "Nano Banana" from the model dropdown
   - Upload an image and verify image generation works

2. Test ChatGPT 5.2 integration:
   - Set `CHATGPT_MODEL=gpt-5.2` in `.env` (when available)
   - Upload an image and verify outfit suggestions use the new model

3. Test fallback behavior:
   - Remove `NANO_BANANA_API_KEY` or use an invalid key
   - Verify that the system falls back to DALL-E 3 gracefully


