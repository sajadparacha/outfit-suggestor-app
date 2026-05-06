"""AI Service for outfit suggestions and image generation using OpenAI and Stable Diffusion"""
import json
import base64
import io
import re
from typing import Optional, Tuple, Literal, Dict, List

import openai
from fastapi import HTTPException
from PIL import Image

from models.outfit import OutfitSuggestion
from utils.cost_calculator import CostCalculator

# Try to import replicate, but make it optional
try:
    import replicate
    REPLICATE_AVAILABLE = True
except ImportError:
    REPLICATE_AVAILABLE = False
    replicate = None


class AIService:
    """Service for interacting with OpenAI API, Nano Banana, and other AI services"""
    
    def __init__(
        self, 
        api_key: str, 
        replicate_token: Optional[str] = None,
        nano_banana_key: Optional[str] = None,
        chatgpt_model: str = "gpt-4o"
    ):
        """
        Initialize AI Service
        
        Args:
            api_key: OpenAI API key
            replicate_token: Replicate API token (optional, for Stable Diffusion)
            nano_banana_key: Nano Banana API key (optional, for Nano Banana image generation)
            chatgpt_model: ChatGPT model version to use (default: "gpt-4o", can be "gpt-5.2" when available)
        """
        self.client = openai.OpenAI(api_key=api_key)
        self.model = chatgpt_model  # Use configurable model
        self.max_tokens = 1000
        self.temperature = 0.7
        self.replicate_token = replicate_token
        self.replicate_client = None
        if replicate_token and REPLICATE_AVAILABLE:
            self.replicate_client = replicate.Client(api_token=replicate_token)
        self.nano_banana_key = nano_banana_key
    
    def get_outfit_suggestion(
        self, 
        image_base64: str, 
        text_input: str = "",
        wardrobe_items: Optional[dict] = None,
        wardrobe_only: bool = False,
        previous_outfit_text: Optional[str] = None,
    ) -> Tuple[OutfitSuggestion, Dict[str, any]]:
        """
        Get outfit suggestion from OpenAI based on image analysis
        
        Args:
            image_base64: Base64 encoded image
            text_input: Additional context or preferences
            wardrobe_items: Optional dict of wardrobe items by category (e.g., {"shirt": [...], "trouser": [...]})
            wardrobe_only: If True, AI must ONLY suggest items from wardrobe (no external suggestions)
            previous_outfit_text: If set, AI should suggest a different outfit than this description
            
        Returns:
            Tuple of (OutfitSuggestion object, cost information dict)
            
        Raises:
            HTTPException: If API call fails
        """
        prompt = self._build_prompt(
            text_input, wardrobe_items, wardrobe_only, previous_outfit_text=previous_outfit_text
        )
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            # Extract usage information
            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            
            # Calculate cost
            gpt4_cost = CostCalculator.calculate_gpt4_cost(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                has_image=True
            )
            
            # Extract and parse the response
            content = response.choices[0].message.content
            suggestion = self._parse_response(content)
            suggestion.ai_prompt = prompt
            suggestion.ai_raw_response = content
            
            # Cost information
            cost_info = {
                "gpt4_cost": gpt4_cost,
                "total_cost": gpt4_cost,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "model_image_cost": 0.0
            }
            
            return suggestion, cost_info
            
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Error calling OpenAI API: {str(e)}"
            )

    def get_outfit_suggestion_text_only(
        self,
        text_input: str = "",
        wardrobe_items: Optional[dict] = None,
        wardrobe_only: bool = True
    ) -> Tuple[OutfitSuggestion, Dict[str, any]]:
        """
        Get outfit suggestion from OpenAI using ONLY text (no uploaded image).
        Typically used for wardrobe-only suggestions based on the user's saved items.
        
        Args:
            text_input: Context/preferences including occasion/season/style
            wardrobe_items: Dict of wardrobe items by category
            wardrobe_only: If True, MUST ONLY use wardrobe items (no external items)
        
        Returns:
            Tuple of (OutfitSuggestion, cost_info)
        """
        prompt = self._build_prompt(text_input, wardrobe_items, wardrobe_only)
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )

            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0

            gpt4_cost = CostCalculator.calculate_gpt4_cost(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                has_image=False
            )

            content = response.choices[0].message.content
            suggestion = self._parse_response(content)
            suggestion.ai_prompt = prompt
            suggestion.ai_raw_response = content

            cost_info = {
                "gpt4_cost": gpt4_cost,
                "total_cost": gpt4_cost,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "model_image_cost": 0.0
            }

            return suggestion, cost_info
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error calling OpenAI API (text-only): {str(e)}"
            )

    def analyze_wardrobe_gaps_with_chatgpt(
        self,
        wardrobe_items: List[dict],
        occasion: str,
        season: str,
        style: str,
        text_input: str = "",
    ) -> dict:
        """
        Premium wardrobe analysis powered by ChatGPT.
        Returns the same shape as WardrobeGapAnalysisResponse.
        """
        prompt = f"""
You are an expert fashion stylist and wardrobe consultant.
Analyze the user's wardrobe and return missing color/style recommendations.

User context:
- occasion: {occasion}
- season: {season}
- style preference: {style}
- extra notes: {text_input or "(none)"}

Wardrobe items (JSON list):
{json.dumps(wardrobe_items, ensure_ascii=True)}

Rules:
1) Analyze categories: shirt, trouser, blazer, shoes, belt.
2) For each category return:
   - category
   - owned_colors (normalized)
   - owned_styles (derived from descriptions)
   - missing_colors
   - missing_styles
   - recommended_purchases (3 concise bullet-like strings)
   - item_count
3) Be practical and fashion-aware for the provided context.
4) Return STRICT JSON only, no markdown, no extra prose.

Required JSON shape:
{{
  "occasion": "string",
  "season": "string",
  "style": "string",
  "analysis_by_category": {{
    "shirt": {{
      "category": "shirt",
      "owned_colors": ["..."],
      "owned_styles": ["..."],
      "missing_colors": ["..."],
      "missing_styles": ["..."],
      "recommended_purchases": ["...", "...", "..."],
      "item_count": 0
    }},
    "trouser": {{ "...": "..." }},
    "blazer": {{ "...": "..." }},
    "shoes": {{ "...": "..." }},
    "belt": {{ "...": "..." }}
  }},
  "overall_summary": "string"
}}
""".strip()

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=self.max_tokens,
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content or "{}"
            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            gpt4_cost = CostCalculator.calculate_gpt4_cost(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                has_image=False,
            )
            parsed = self._safe_parse_json_object(content)

            # Minimal shape enforcement fallback
            required_categories = ["shirt", "trouser", "blazer", "shoes", "belt"]
            categories = parsed.get("analysis_by_category", {})
            if not isinstance(categories, dict):
                categories = {}
            for category in required_categories:
                entry = categories.get(category, {})
                categories[category] = {
                    "category": category,
                    "owned_colors": entry.get("owned_colors", []) if isinstance(entry, dict) else [],
                    "owned_styles": entry.get("owned_styles", []) if isinstance(entry, dict) else [],
                    "missing_colors": entry.get("missing_colors", []) if isinstance(entry, dict) else [],
                    "missing_styles": entry.get("missing_styles", []) if isinstance(entry, dict) else [],
                    "recommended_purchases": entry.get("recommended_purchases", []) if isinstance(entry, dict) else [],
                    "item_count": entry.get("item_count", 0) if isinstance(entry, dict) else 0,
                }

            return {
                "occasion": str(parsed.get("occasion", occasion)),
                "season": str(parsed.get("season", season)),
                "style": str(parsed.get("style", style)),
                "analysis_mode": "premium",
                "analysis_by_category": categories,
                "overall_summary": str(parsed.get("overall_summary", "Premium wardrobe analysis completed.")),
                "ai_prompt": prompt,
                "ai_raw_response": content,
                "cost": {
                    "gpt4_cost": gpt4_cost,
                    "model_image_cost": 0.0,
                    "total_cost": gpt4_cost,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                },
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error calling OpenAI API for premium wardrobe analysis: {str(e)}",
            )

    def _safe_parse_json_object(self, content: str) -> dict:
        """
        Parse model output robustly even when the model emits minor JSON formatting issues.
        """
        candidates: List[str] = []
        raw = (content or "").strip()
        if not raw:
            return {}

        # Candidate 1: raw content as-is.
        candidates.append(raw)

        # Candidate 2: strip common markdown code fences.
        fenced = raw
        if fenced.startswith("```"):
            fenced = re.sub(r"^```(?:json)?\s*", "", fenced, flags=re.IGNORECASE)
            fenced = re.sub(r"\s*```$", "", fenced)
            candidates.append(fenced.strip())

        # Candidate 3: extract the outermost JSON object.
        start_idx = raw.find("{")
        end_idx = raw.rfind("}") + 1
        if start_idx >= 0 and end_idx > start_idx:
            candidates.append(raw[start_idx:end_idx].strip())

        # Candidate 4: trailing-comma cleaned variants.
        for candidate in list(candidates):
            cleaned = re.sub(r",\s*([}\]])", r"\1", candidate)
            if cleaned != candidate:
                candidates.append(cleaned)

        last_error: Optional[Exception] = None
        seen = set()
        for candidate in candidates:
            if candidate in seen:
                continue
            seen.add(candidate)
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except Exception as exc:
                last_error = exc

        if last_error:
            raise last_error
        return {}
    
    def _build_prompt(
        self,
        text_input: str = "",
        wardrobe_items: Optional[dict] = None,
        wardrobe_only: bool = False,
        previous_outfit_text: Optional[str] = None,
    ) -> str:
        """
        Build the prompt for OpenAI API
        
        Args:
            text_input: Additional context from user
            wardrobe_items: Optional dict of wardrobe items by category
            wardrobe_only: If True, ONLY suggest items from wardrobe; do not suggest items they don't have
            previous_outfit_text: If set, user wants a different outfit than this description (e.g. "next" flow)

        Returns:
            Formatted prompt string
        """
        wardrobe_context = ""
        if wardrobe_items:
            if wardrobe_only:
                wardrobe_context = "\n\n🚫 CRITICAL CONSTRAINT: The user wants suggestions ONLY from their wardrobe. "
                wardrobe_context += "You MUST NOT suggest any item that is not listed below. "
                wardrobe_context += "Only recommend combinations using their existing items. "
                wardrobe_context += "If they don't have a suitable item in a category, say 'Consider adding a [type] to your wardrobe' for that slot.\n\n"
            else:
                wardrobe_context = "\n\n⚠️ IMPORTANT: The user has the following items in their wardrobe. "
                wardrobe_context += "PRIORITIZE using items from their wardrobe when possible. "
                wardrobe_context += "Only suggest items they don't have if necessary for a complete outfit.\n\n"
            wardrobe_context += (
                "PRIVACY AND DATA RULE: Wardrobe images are intentionally excluded. "
                "Do NOT request or infer any missing image bytes. Use only the textual wardrobe fields below.\n"
            )
            wardrobe_context += "USER'S WARDROBE:\n"
            
            for category, items in wardrobe_items.items():
                if items:
                    wardrobe_context += f"\n{category.upper()} ({len(items)} item(s)):\n"
                    for item in items:
                        item_desc = []
                        if hasattr(item, 'id') and item.id is not None:
                            item_desc.append(f"ID: {item.id}")
                        if hasattr(item, 'category') and item.category:
                            item_desc.append(f"Category: {item.category}")
                        if hasattr(item, 'name') and item.name:
                            item_desc.append(f"Name: {item.name}")
                        if hasattr(item, 'color') and item.color:
                            item_desc.append(f"Color: {item.color}")
                        if hasattr(item, 'description') and item.description:
                            item_desc.append(f"Description: {item.description}")
                        if hasattr(item, 'brand') and item.brand:
                            item_desc.append(f"Brand: {item.brand}")
                        if hasattr(item, 'size') and item.size:
                            item_desc.append(f"Size: {item.size}")
                        if hasattr(item, 'tags') and item.tags:
                            item_desc.append(f"Tags: {item.tags}")
                        if hasattr(item, 'condition') and item.condition:
                            item_desc.append(f"Condition: {item.condition}")
                        if hasattr(item, 'purchase_date') and item.purchase_date:
                            item_desc.append(f"Purchase date: {item.purchase_date}")
                        if hasattr(item, 'last_worn') and item.last_worn:
                            item_desc.append(f"Last worn: {item.last_worn}")
                        
                        if item_desc:
                            wardrobe_context += f"  - {' | '.join(item_desc)}\n"
                        else:
                            wardrobe_context += f"  - {category} item\n"
            
            if wardrobe_only:
                wardrobe_context += "\nWhen making recommendations:\n"
                wardrobe_context += "1. ONLY use items from the wardrobe list above\n"
                wardrobe_context += "2. Do NOT invent or suggest any item not listed\n"
                wardrobe_context += "3. Build the outfit by combining their existing items\n"
                wardrobe_context += "4. For categories with no suitable item, write both: (a) a 'Consider adding a [type] to your wardrobe' note AND (b) a concrete AI suggestion with color/style/material details for that missing item\n"
                wardrobe_context += "5. Preserve item IDs exactly as provided (these are primary keys)\n"
            else:
                wardrobe_context += "\nWhen making recommendations:\n"
                wardrobe_context += "1. FIRST check if the user has suitable items in their wardrobe\n"
                wardrobe_context += "2. If they have matching items, recommend using those (mention 'you already have...')\n"
                wardrobe_context += "3. Only suggest new items if their wardrobe doesn't have suitable options\n"
                wardrobe_context += "4. For items from their wardrobe, reference the description/color/brand you listed above\n"
                wardrobe_context += "5. If you choose an item from wardrobe, return its exact ID unchanged\n"

        previous_block = ""
        if previous_outfit_text and str(previous_outfit_text).strip():
            prev = str(previous_outfit_text).strip()
            if len(prev) > 12000:
                prev = prev[:12000] + "\n[truncated]"
            previous_block = f"""

IMPORTANT — USER REQUESTED AN ALTERNATIVE OUTFIT:
The user already received a complete outfit suggestion and wants a DIFFERENT outfit for the same uploaded photo and preferences.
You MUST propose a noticeably different outfit: vary colors, pieces, formality, silhouette, or styling. Do NOT repeat the same combination or a near-duplicate.

Previous suggestion (do NOT repeat this; use it only as what to avoid):
---
{prev}
---

"""

        context_parts: List[str] = []
        if previous_block.strip():
            context_parts.append(previous_block.strip())
        if text_input:
            context_parts.append(f"Additional context: {text_input}")
        context = ("\n\n".join(context_parts)) if context_parts else ""

        prompt = """
You are a professional fashion stylist. Analyze the uploaded image of a shirt or blazer and provide a complete outfit suggestion.
{wardrobe_context}
{context}

Please provide a complete outfit recommendation including:
1. Shirt (if not already provided in the image, suggest a complementary one)
2. Trouser/Pants
3. Blazer/Jacket (if not already provided in the image, suggest a complementary one)
4. Shoes
5. Belt
6. Brief reasoning for the outfit choice

Consider:
- Color coordination
- Occasion appropriateness
- Style consistency
- Seasonal appropriateness
- Professional vs casual context
- User's existing wardrobe items (prioritize using what they have)

Respond in JSON format with the following structure:
{{
    "shirt": "detailed description of the shirt (mention if from user's wardrobe)",
    "trouser": "detailed description of the trousers/pants (mention if from user's wardrobe)",
    "blazer": "detailed description of the blazer/jacket (mention if from user's wardrobe)",
    "shoes": "detailed description of the shoes (mention if from user's wardrobe)",
    "belt": "detailed description of the belt (mention if from user's wardrobe)",
    "shirt_id": integer or null,
    "trouser_id": integer or null,
    "blazer_id": integer or null,
    "shoes_id": integer or null,
    "belt_id": integer or null,
    "source_slot": "one of: shirt, trouser, blazer, shoes, belt, or null (which slot in this outfit corresponds to the uploaded item)",
    "reasoning": "brief explanation of why this outfit works well together"
}}
""".format(
            wardrobe_context=wardrobe_context,
            context=f"\n{context}" if context else ""
        )
        
        return prompt
    
    def _parse_response(self, content: str) -> OutfitSuggestion:
        """
        Parse OpenAI response into OutfitSuggestion object
        
        Args:
            content: Raw response content from OpenAI
            
        Returns:
            OutfitSuggestion object
        """
        try:
            # Find JSON in the response (in case there's extra text)
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            json_str = content[start_idx:end_idx]
            
            outfit_data = json.loads(json_str)
            
            def _parse_optional_int(value):
                if value is None:
                    return None
                if isinstance(value, int):
                    return value
                if isinstance(value, str):
                    stripped = value.strip()
                    if stripped.isdigit():
                        return int(stripped)
                return None

            def _parse_source_slot(value):
                if value is None:
                    return None
                if not isinstance(value, str):
                    return None
                normalized = value.strip().lower()
                aliases = {
                    "shirt": "shirt",
                    "shirts": "shirt",
                    "trouser": "trouser",
                    "trousers": "trouser",
                    "pant": "trouser",
                    "pants": "trouser",
                    "blazer": "blazer",
                    "blazers": "blazer",
                    "jacket": "blazer",
                    "jackets": "blazer",
                    "shoe": "shoes",
                    "shoes": "shoes",
                    "belt": "belt",
                    "belts": "belt",
                }
                return aliases.get(normalized)

            return OutfitSuggestion(
                shirt=outfit_data.get("shirt", "Classic white dress shirt"),
                trouser=outfit_data.get("trouser", "Dark navy dress trousers"),
                blazer=outfit_data.get("blazer", "Charcoal gray blazer"),
                shoes=outfit_data.get("shoes", "Black leather dress shoes"),
                belt=outfit_data.get("belt", "Black leather belt"),
                shirt_id=_parse_optional_int(outfit_data.get("shirt_id")),
                trouser_id=_parse_optional_int(outfit_data.get("trouser_id")),
                blazer_id=_parse_optional_int(outfit_data.get("blazer_id")),
                shoes_id=_parse_optional_int(outfit_data.get("shoes_id")),
                belt_id=_parse_optional_int(outfit_data.get("belt_id")),
                source_slot=_parse_source_slot(outfit_data.get("source_slot")),
                reasoning=outfit_data.get(
                    "reasoning", 
                    "A classic professional look that works for most business occasions."
                )
            )
        except (json.JSONDecodeError, KeyError):
            # Fallback if JSON parsing fails
            return OutfitSuggestion(
                shirt="Classic white dress shirt",
                trouser="Dark navy dress trousers",
                blazer="Charcoal gray blazer",
                shoes="Black leather dress shoes",
                belt="Black leather belt",
                reasoning="A professional outfit suggestion based on your uploaded image."
            )
    
    def generate_model_image(
        self,
        outfit_suggestion: OutfitSuggestion,
        uploaded_image_base64: Optional[str] = None,
        location: Optional[str] = None,
        location_details: Optional[dict] = None,
        model: Literal["dalle3", "stable-diffusion", "nano-banana"] = "dalle3"
    ) -> Tuple[str, float]:
        """
        Generate an image of a male model wearing the recommended outfit.
        The model's appearance is customized based on geographical location.
        If uploaded_image_base64 is provided, the exact clothing from the image will be preserved.
        
        Args:
            outfit_suggestion: The outfit recommendation to visualize
            uploaded_image_base64: Base64 encoded image of the uploaded clothing (optional)
            location: User's location (e.g., "New York, USA", "London, UK")
            location_details: Optional dict with location info (country, region, etc.)
            model: Image generation model to use ("dalle3" or "stable-diffusion")
            
        Returns:
            Base64 encoded image of the model wearing the outfit
            
        Raises:
            HTTPException: If image generation fails
        """
        if model == "stable-diffusion":
            image, cost = self._generate_with_stable_diffusion(
                outfit_suggestion,
                uploaded_image_base64,
                location,
                location_details
            )
            return image, cost
        elif model == "nano-banana":
            image, cost = self._generate_with_nano_banana(
                outfit_suggestion,
                uploaded_image_base64,
                location,
                location_details
            )
            return image, cost
        else:
            image, cost = self._generate_with_dalle3(
                outfit_suggestion,
                uploaded_image_base64,
                location,
                location_details
            )
            return image, cost
    
    def _generate_with_dalle3(
        self,
        outfit_suggestion: OutfitSuggestion,
        uploaded_image_base64: Optional[str] = None,
        location: Optional[str] = None,
        location_details: Optional[dict] = None
    ) -> Tuple[str, float]:
        """
        Generate model image using DALL-E 3 (text-to-image only).
        """
        # Analyze uploaded image in detail if provided to preserve exact clothing features
        # NOTE: DALL-E 3 API only accepts text prompts, not image inputs.
        # Therefore, we use GPT-4 Vision to create an extremely detailed text description
        # of the uploaded image, which is then passed to DALL-E 3 in the prompt.
        clothing_details = None
        if uploaded_image_base64:
            print("🔍 Analyzing uploaded image with GPT-4 Vision to create detailed description for DALL-E...")
            clothing_details = self._analyze_uploaded_clothing(uploaded_image_base64)
            print(f"✅ Clothing analysis complete: {clothing_details[:100] if clothing_details else 'None'}...")
        
        # Build prompt for DALL-E based on outfit, location, and exact clothing details
        prompt = self._build_model_image_prompt(
            outfit_suggestion, 
            location, 
            location_details,
            clothing_details
        )
        print(f"🔍 DEBUG: DALL-E prompt: {prompt[:200]}...")
        
        try:
            print(f"🔍 DEBUG: Calling OpenAI DALL-E 3 API...")
            # Generate image using DALL-E 3 - use tall portrait format for full body
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1792",  # Tall portrait format for full body head-to-toe
                quality="standard",
                n=1,
            )
            print(f"✅ DALL-E API response received")
            
            # Get image URL
            image_url = response.data[0].url
            
            # Download and convert to base64
            import requests
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            
            # Get content type from response headers
            content_type = image_response.headers.get('content-type', 'image/png')
            print(f"Downloaded image, content-type: {content_type}, size: {len(image_response.content)} bytes")
            
            # Convert to base64
            image_base64 = base64.b64encode(image_response.content).decode('utf-8')
            print(f"Base64 encoded, length: {len(image_base64)}")
            
            # Calculate DALL-E 3 cost (using size from response)
            dalle3_cost = CostCalculator.calculate_dalle3_cost(size="1024x1792", quality="standard")
            
            return image_base64, dalle3_cost
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error generating model image with DALL-E 3: {str(e)}"
            )
    
    def _generate_with_stable_diffusion(
        self,
        outfit_suggestion: OutfitSuggestion,
        uploaded_image_base64: Optional[str] = None,
        location: Optional[str] = None,
        location_details: Optional[dict] = None
    ) -> Tuple[str, float]:
        """
        Generate model image using Stable Diffusion (supports image-to-image with reference).
        This provides better color accuracy as it can use the uploaded image as reference.
        """
        if not REPLICATE_AVAILABLE:
            raise HTTPException(
                status_code=500,
                detail="Stable Diffusion requires 'replicate' package. Install with: pip install replicate"
            )
        
        if not self.replicate_token:
            error_msg = (
                "REPLICATE_API_TOKEN environment variable is not set. "
                "To use Stable Diffusion, please set REPLICATE_API_TOKEN in your .env file. "
                "Get your token from: https://replicate.com/account/api-tokens"
            )
            print(f"❌ {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
        
        try:
            print("🔍 Generating model image with Stable Diffusion (image-to-image)...")
            if not self.replicate_client:
                raise HTTPException(
                    status_code=500,
                    detail="Replicate client not initialized. Check REPLICATE_API_TOKEN."
                )
            
            # Build prompt for Stable Diffusion
            model_description = self._get_location_based_model_description(location, location_details)
            prompt = self._build_stable_diffusion_prompt(
                outfit_suggestion,
                model_description,
                uploaded_image_base64 is not None
            )
            
            # Prepare input image if provided
            init_image = None
            if uploaded_image_base64:
                # Decode base64 to image
                image_data = base64.b64decode(uploaded_image_base64)
                init_image = Image.open(io.BytesIO(image_data))
                print("✅ Using uploaded image as reference for Stable Diffusion")
            
            # Use Stable Diffusion XL 
            # Note: SDXL on Replicate may not support direct image-to-image
            # So we'll use text-to-image with a very detailed description of the uploaded clothing
            if init_image and uploaded_image_base64:
                print(f"🔍 Analyzing uploaded image for Stable Diffusion prompt...")
                # Get detailed description of uploaded clothing
                clothing_details = self._analyze_uploaded_clothing(uploaded_image_base64)
                if clothing_details:
                    # Enhance prompt with detailed clothing description
                    enhanced_prompt = f"""
{prompt}

CRITICAL: The model is wearing a USER-UPLOADED SHIRT. You MUST recreate it EXACTLY as described below.

UPLOADED SHIRT DESCRIPTION (MATCH EXACTLY):
{clothing_details[:800]}

The shirt must match the description above EXACTLY - same colors, same patterns, same style.
"""
                    prompt = enhanced_prompt.strip()
                    print(f"✅ Enhanced prompt with clothing details")
            
            print(f"🔍 Calling Replicate API with Stable Diffusion...")
            print(f"   Prompt length: {len(prompt)} characters")
            
            # Use SDXL model for text-to-image generation
            output = self.replicate_client.run(
                "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                input={
                    "prompt": prompt,
                    "num_outputs": 1,
                    "aspect_ratio": "9:16",
                    "output_format": "png"
                }
            )
            
            print(f"✅ Replicate API response received: {type(output)}")
            
            # Get the generated image URL
            # Replicate returns a list or a single URL
            if isinstance(output, list):
                image_url = output[0] if len(output) > 0 else None
            elif isinstance(output, str):
                image_url = output
            else:
                # Handle generator/async response
                image_url = None
                for item in output:
                    image_url = item
                    break
            
            if not image_url:
                raise HTTPException(
                    status_code=500,
                    detail="No image URL returned from Replicate API"
                )
            
            print(f"📥 Image URL: {image_url}")
            
            # Download and convert to base64
            import requests
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            
            image_base64 = base64.b64encode(image_response.content).decode('utf-8')
            print(f"✅ Stable Diffusion image generated, base64 length: {len(image_base64)}")
            
            # Calculate Stable Diffusion cost
            sd_cost = CostCalculator.calculate_stable_diffusion_cost()
            
            return image_base64, sd_cost
            
        except Exception as e:
            print(f"❌ Stable Diffusion generation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"Error generating model image with Stable Diffusion: {str(e)}"
            )
    
    def _generate_with_nano_banana(
        self,
        outfit_suggestion: OutfitSuggestion,
        uploaded_image_base64: Optional[str] = None,
        location: Optional[str] = None,
        location_details: Optional[dict] = None
    ) -> Tuple[str, float]:
        """
        Generate model image using Nano Banana API.
        Nano Banana supports image-to-image generation which can better preserve uploaded clothing details.
        """
        if not self.nano_banana_key:
            error_msg = (
                "NANO_BANANA_API_KEY environment variable is not set. "
                "To use Nano Banana, please set NANO_BANANA_API_KEY in your .env file. "
                "Get your token from: https://nanobnana.com"
            )
            print(f"❌ {error_msg}")
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
        
        try:
            import requests
            
            print("🔍 Generating model image with Nano Banana...")
            
            # Build prompt for Nano Banana
            model_description = self._get_location_based_model_description(location, location_details)
            prompt = self._build_nano_banana_prompt(
                outfit_suggestion,
                model_description,
                uploaded_image_base64 is not None
            )
            
            # Prepare the request
            api_url = "https://api.nanobnana.com/v1/generate"  # Update with actual endpoint
            headers = {
                "Authorization": f"Bearer {self.nano_banana_key}",
                "Content-Type": "application/json"
            }
            
            # Build request payload
            payload = {
                "prompt": prompt,
                "aspect_ratio": "9:16",  # Portrait for full body
                "output_format": "png"
            }
            
            # If we have an uploaded image, use it as reference
            if uploaded_image_base64:
                # Analyze uploaded image for detailed description
                print(f"🔍 Analyzing uploaded image for Nano Banana prompt...")
                clothing_details = self._analyze_uploaded_clothing(uploaded_image_base64)
                if clothing_details:
                    # Enhance prompt with detailed clothing description
                    enhanced_prompt = f"""
{prompt}

CRITICAL: The model is wearing a USER-UPLOADED SHIRT. You MUST recreate it EXACTLY as described below.

UPLOADED SHIRT DESCRIPTION (MATCH EXACTLY):
{clothing_details[:800]}

The shirt must match the description above EXACTLY - same colors, same patterns, same style.
"""
                    payload["prompt"] = enhanced_prompt.strip()
                    print(f"✅ Enhanced prompt with clothing details")
                
                # Add image reference if Nano Banana supports it
                payload["reference_image"] = uploaded_image_base64
            
            print(f"🔍 Calling Nano Banana API...")
            print(f"   Prompt length: {len(payload['prompt'])} characters")
            
            # Make API request
            response = requests.post(api_url, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            
            result = response.json()
            print(f"✅ Nano Banana API response received: {type(result)}")
            
            # Extract image URL or base64 from response
            # Adjust based on actual Nano Banana API response format
            image_url = None
            if isinstance(result, dict):
                image_url = result.get("image_url") or result.get("url") or result.get("data", {}).get("url")
            elif isinstance(result, str):
                image_url = result
            
            if not image_url:
                # Check if response contains base64 image directly
                if isinstance(result, dict) and result.get("image_base64"):
                    image_base64 = result["image_base64"]
                    print(f"✅ Nano Banana image generated from base64, length: {len(image_base64)}")
                    # Calculate Nano Banana cost
                    nb_cost = CostCalculator.calculate_nano_banana_cost()
                    return image_base64, nb_cost
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="No image URL or base64 returned from Nano Banana API"
                    )
            
            print(f"📥 Image URL: {image_url}")
            
            # Download and convert to base64
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            
            image_base64 = base64.b64encode(image_response.content).decode('utf-8')
            print(f"✅ Nano Banana image generated, base64 length: {len(image_base64)}")
            
            # Calculate Nano Banana cost
            nb_cost = CostCalculator.calculate_nano_banana_cost()
            
            return image_base64, nb_cost
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Nano Banana API request failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error calling Nano Banana API: {str(e)}"
            )
        except Exception as e:
            print(f"❌ Nano Banana generation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=500,
                detail=f"Error generating model image with Nano Banana: {str(e)}"
            )
    
    def _build_nano_banana_prompt(
        self,
        outfit: OutfitSuggestion,
        model_description: str,
        has_reference_image: bool
    ) -> str:
        """
        Build prompt for Nano Banana image generation.
        """
        if has_reference_image:
            # Image-to-image mode - reference image preserves the shirt
            prompt = f"""
Professional fashion photo: {model_description} male model, full body head to toe, studio background.

Complete the outfit with:
- Blazer/Jacket: {outfit.blazer} (worn over the shirt)
- Trousers: {outfit.trouser}
- Dress Shoes: {outfit.shoes}
- Belt: {outfit.belt}

Full body shot showing complete outfit. Professional fashion photography, high quality, realistic, detailed.
"""
        else:
            # Text-to-image mode - describe full outfit
            prompt = f"""
Professional fashion photo: {model_description} male model, full body head to toe, studio background.

Complete outfit (ALL ITEMS MANDATORY):
- Shirt: {outfit.shirt}
- ⚠️ MANDATORY BLAZER/JACKET: {outfit.blazer} (MUST be worn over the shirt, fully visible)
- Trousers: {outfit.trouser}
- Shoes: {outfit.shoes}
- Belt: {outfit.belt}

CRITICAL: The model MUST be wearing ALL items, especially the blazer/jacket. The blazer must be clearly visible on the model's upper body. Full body shot showing complete outfit including the blazer. Professional fashion photography, high quality, realistic, detailed.
"""
        return prompt.strip()
    
    def _build_stable_diffusion_prompt(
        self,
        outfit: OutfitSuggestion,
        model_description: str,
        has_reference_image: bool
    ) -> str:
        """
        Build prompt for Stable Diffusion.
        When has_reference_image is True, the prompt focuses on completing the outfit.
        """
        if has_reference_image:
            # Image-to-image mode - reference image preserves the shirt
            prompt = f"""
Professional fashion photo: {model_description} male model, full body head to toe, studio background.

Complete the outfit with (ALL MANDATORY):
- ⚠️ MANDATORY BLAZER/JACKET: {outfit.blazer} (MUST be worn over the shirt, fully visible, clearly present)
- Trousers: {outfit.trouser}
- Dress Shoes: {outfit.shoes}
- Belt: {outfit.belt}

CRITICAL: The blazer/jacket is MANDATORY and MUST be visible on the model. The model must be wearing the blazer over the shirt. Full body shot showing complete outfit including the blazer. Professional fashion photography, high quality, realistic.
"""
        else:
            # Text-to-image mode - describe full outfit
            prompt = f"""
Professional fashion photo: {model_description} male model, full body head to toe, studio background.

Complete outfit (ALL ITEMS MANDATORY):
- Shirt: {outfit.shirt}
- ⚠️ MANDATORY BLAZER/JACKET: {outfit.blazer} (MUST be worn over the shirt, fully visible)
- Trousers: {outfit.trouser}
- Shoes: {outfit.shoes}
- Belt: {outfit.belt}

CRITICAL: The model MUST be wearing ALL items, especially the blazer/jacket. The blazer must be clearly visible on the model's upper body. Full body shot showing complete outfit including the blazer. Professional fashion photography, high quality, realistic.
"""
        return prompt.strip()
    
    def _analyze_uploaded_clothing(self, image_base64: str) -> str:
        """
        Analyze the uploaded clothing image in detail to extract exact features.
        This ensures the generated model image preserves the exact clothing.
        
        Args:
            image_base64: Base64 encoded image of the uploaded clothing
            
        Returns:
            Detailed description of the clothing features
        """
        analysis_prompt = """
        CRITICAL MISSION: You are analyzing a user's uploaded clothing image. This description will be sent to DALL-E 3 to recreate this EXACT SAME clothing item on a model. DALL-E 3 cannot see the image - it ONLY receives your text description. Therefore, your description must be EXTREMELY detailed and precise so DALL-E can recreate it pixel-perfectly.
        
        Your description is the ONLY way DALL-E will know what the clothing looks like. Be EXTREMELY specific about EVERY visual detail, especially COLORS.
        
        START YOUR RESPONSE WITH A COLOR SUMMARY:
        PRIMARY COLOR: [Exact color name and shade, e.g., "Navy blue", "Burgundy red", "Charcoal gray"]
        SECONDARY COLORS (if any): [List all other colors with exact shades]
        
        THEN PROVIDE DETAILED ANALYSIS:
        
        1. ITEM TYPE: 
           State exactly what type of clothing this is (e.g., "dress shirt", "blazer", "sport coat", "polo shirt", "t-shirt", "sweater")
        
        2. EXACT COLORS (MOST CRITICAL - BE EXTREMELY PRECISE):
           - Primary color: Use SPECIFIC color names (e.g., "navy blue", "burgundy", "charcoal gray", "forest green", "royal blue", "crimson red", NOT generic "blue" or "red")
           - Color shade/intensity: Describe EXACT shade (e.g., "deep navy blue", "light sky blue", "dark charcoal gray", "bright cherry red", "olive green")
           - If multiple colors: List EACH color with its EXACT shade and location
           - Color saturation: Describe if colors are vibrant, muted, pastel, etc.
           - Any color gradients or variations: Describe EXACTLY how colors transition
           - IMPORTANT: If the shirt is blue, say "blue" AND the exact shade (e.g., "navy blue", "sky blue", "royal blue"). Do NOT just say "blue".
        
        3. PATTERN DETAILS (IF APPLICABLE):
           - Pattern type: State clearly (solid, stripes, checks, plaid, dots, geometric, etc.)
           - If STRIPED: 
             * Stripe direction (vertical, horizontal, diagonal)
             * Stripe width (thin, medium, thick, or approximate measurements)
             * Stripe spacing (close together, medium spacing, wide spacing)
             * Stripe colors (list each color specifically)
           - If CHECKED:
             * Check size (small, medium, large)
             * Check colors (list each color)
             * Check pattern style (windowpane, gingham, tattersall, etc.)
           - If PLAID:
             * Plaid colors (list all colors in the pattern)
             * Line thickness (thin, medium, thick)
             * Pattern complexity (simple, complex)
           - If DOTS or OTHER PATTERNS:
             * Pattern size and spacing
             * Pattern colors
             * Pattern arrangement
        
        4. MATERIAL/TEXTURE APPEARANCE:
           - Material type: What material it appears to be (cotton, wool, silk, linen, polyester, etc.)
           - Texture: Describe the surface (smooth, textured, ribbed, knit, woven, etc.)
           - Finish: Describe the finish (matte, shiny, glossy, brushed, etc.)
           - Fabric weight: Apparent weight (light, medium, heavy)
        
        5. STYLE DETAILS:
           - Collar: Type and style (if applicable: spread collar, point collar, button-down, mandarin, etc.)
           - Buttons: Style (standard, decorative), color, material (plastic, metal, fabric-covered), placement
           - Pockets: Type (chest pocket, side pockets), style, placement
           - Cuffs: Style (if visible: barrel cuffs, French cuffs, etc.)
           - Lapels: Style (if applicable: notch lapel, peak lapel, shawl collar, etc.)
           - Other design elements: Any other distinctive style features
        
        6. FIT AND CUT:
           - Fit: Apparent fit (slim fit, regular fit, relaxed fit, oversized)
           - Cut: Style (tailored, casual, athletic, etc.)
        
        7. DISTINCTIVE FEATURES:
           - Logos/Branding: Describe any logos, emblems, or brand markings exactly (location, size, colors)
           - Embroidery: Any embroidery or decorative stitching (describe pattern, colors, location)
           - Buttons: Material, color, style (if distinctive)
           - Unique elements: Any other unique design features
           - Text: Any visible text (quote exactly, including font style if noticeable)
        
        8. OVERALL CHARACTERISTICS:
           - Style category: (formal, business, casual, sporty, etc.)
           - Any distinctive characteristics that make this item unique
        
        CRITICAL RULES FOR YOUR DESCRIPTION:
        - COLORS ARE THE MOST IMPORTANT: Use SPECIFIC color names with exact shades (e.g., "navy blue" not "blue", "burgundy red" not "red", "charcoal gray" not "gray")
        - If you see blue, identify the EXACT shade: navy blue, sky blue, royal blue, powder blue, etc.
        - If you see red, identify the EXACT shade: burgundy, crimson, cherry red, scarlet, etc.
        - Describe ONLY what you actually see - do not infer or assume
        - Be PRECISE about patterns - include measurements, spacing, directions
        - Include ALL visible details - nothing is too small to mention
        - Do NOT suggest improvements, changes, or alternatives
        - Do NOT generalize - be specific about every aspect
        - If uncertain about a detail, describe what you can clearly see
        
        FINAL REMINDER: Colors are CRITICAL. If the shirt is blue, you MUST specify the exact shade of blue. 
        DALL-E will use your exact words, so "blue" will give a generic blue, but "navy blue" will give navy blue.
        Your description must be detailed enough that DALL-E can recreate this EXACT clothing item with 100% color accuracy.
        Be thorough, specific, and accurate - especially with colors.
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": analysis_prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1500,  # Maximum detail for pixel-perfect recreation
                temperature=0.1  # Very low temperature for maximum precision
            )
            
            clothing_description = response.choices[0].message.content
            print(f"📝 Clothing analysis: {clothing_description[:200]}...")
            return clothing_description
            
        except Exception as e:
            print(f"⚠️ Warning: Failed to analyze uploaded clothing: {e}")
            return None
    
    def _build_model_image_prompt(
        self,
        outfit: OutfitSuggestion,
        location: Optional[str] = None,
        location_details: Optional[dict] = None,
        exact_clothing_details: Optional[str] = None
    ) -> str:
        """
        Build a detailed prompt for DALL-E to generate a model image.
        
        Args:
            outfit: Outfit suggestion details
            location: User's location string
            location_details: Additional location information
            exact_clothing_details: Detailed analysis of uploaded clothing to preserve exactly
            
        Returns:
            Formatted prompt for DALL-E
        """
        # Build location-based model description
        model_description = self._get_location_based_model_description(location, location_details)
        
        # Build outfit description using ChatGPT's recommendations
        # Truncate clothing details if provided to fit within DALL-E's 4000 char limit
        # DALL-E 3 has a 4000 character prompt limit, so we need to balance detail vs length
        truncated_details = ""
        if exact_clothing_details:
            # Keep up to 1200 chars of the detailed analysis (leaves room for other prompt text)
            truncated_details = exact_clothing_details[:1200] if len(exact_clothing_details) > 1200 else exact_clothing_details
        
        if truncated_details:
            # User uploaded a shirt - MUST preserve it exactly
            # NOTE: DALL-E 3 cannot see the original image - it only receives this text description
            # Therefore, the description below must be followed EXACTLY
            prompt = f"""
⚠️⚠️⚠️ ABSOLUTE PRIORITY: USER-UPLOADED SHIRT ⚠️⚠️⚠️

The model MUST wear this EXACT shirt. This description was created by analyzing the user's actual uploaded image.
You MUST recreate it with 100% accuracy - same colors, same patterns, same style, same EVERYTHING.

SHIRT TO RECREATE (THIS IS THE MOST IMPORTANT PART - MATCH EXACTLY):
{truncated_details}

CRITICAL COLOR MATCHING RULES:
- If the description says a specific color (e.g., "navy blue", "burgundy", "charcoal gray"), use THAT EXACT COLOR
- Do NOT use a similar color or a "close enough" color
- Do NOT change the color shade or intensity
- If it says "blue", check the description for the exact shade (navy, sky, royal, etc.) and use that EXACT shade

Fashion catalog photo: {model_description} male model, full body head to toe, studio background.

The model is wearing the EXACT shirt described above, plus:
- ⚠️ MANDATORY BLAZER/JACKET: {outfit.blazer} (MUST be worn over the shirt, fully visible, buttoned or unbuttoned but clearly present)
- Trousers: {outfit.trouser}
- Dress Shoes: {outfit.shoes}
- Belt: {outfit.belt}

MANDATORY REQUIREMENTS (ALL MUST BE VISIBLE):
1. The shirt is the TOP PRIORITY - it must match the description EXACTLY
2. ⚠️ THE BLAZER IS MANDATORY - The model MUST be wearing a blazer/jacket: {outfit.blazer}. The blazer must be clearly visible, worn over the shirt, and match the description exactly. DO NOT omit the blazer.
3. Colors must match EXACTLY - no variations or "close enough" colors
4. Show complete outfit: shirt + BLAZER (mandatory) + trousers + shoes (all visible)
5. Full body shot from head to feet
6. Professional fashion photography quality
7. The blazer must be visible on the model's upper body - either fully buttoned, partially buttoned, or open but clearly worn
            """.strip()
        else:
            # No uploaded clothing - use ChatGPT's full recommendation
            prompt = f"""
Fashion photo: {model_description} male model, full body head to toe, studio background.

COMPLETE OUTFIT (ALL ITEMS MANDATORY):
- Shirt: {outfit.shirt}
- ⚠️ MANDATORY BLAZER/JACKET: {outfit.blazer} (MUST be worn over the shirt, fully visible)
- Trousers: {outfit.trouser}
- Shoes: {outfit.shoes}
- Belt: {outfit.belt}

CRITICAL: The model MUST be wearing ALL items listed above, especially the blazer/jacket. The blazer must be clearly visible on the model's upper body. Show all items clearly. Full body shot with visible shoes. Professional quality.
            """.strip()
        
        return prompt
    
    def _get_location_based_model_description(
        self,
        location: Optional[str] = None,
        location_details: Optional[dict] = None
    ) -> str:
        """
        Get model description based on geographical location.
        This helps create more culturally appropriate and relatable model appearances.
        
        Args:
            location: Location string (e.g., "New York, USA")
            location_details: Dict with country, region, etc.
            
        Returns:
            Model description string
        """
        if not location and not location_details:
            return "diverse, professional"
        
        # Extract country/region from location
        country = None
        if location_details and location_details.get('country'):
            country_name = location_details['country'].lower()
            # Check for Saudi Arabia specifically
            if 'saudi' in country_name or 'ksa' in country_name:
                country = 'saudi_arabia'
            elif 'united arab emirates' in country_name or 'uae' in country_name:
                country = 'uae'
            else:
                country = country_name
        elif location:
            # Try to extract country from location string
            location_lower = location.lower()
            if 'usa' in location_lower or 'united states' in location_lower or 'america' in location_lower:
                country = 'usa'
            elif 'uk' in location_lower or 'united kingdom' in location_lower or 'britain' in location_lower:
                country = 'uk'
            elif 'india' in location_lower:
                country = 'india'
            elif 'pakistan' in location_lower:
                country = 'pakistan'
            elif 'china' in location_lower:
                country = 'china'
            elif 'japan' in location_lower:
                country = 'japan'
            elif 'korea' in location_lower:
                country = 'korea'
            elif 'saudi' in location_lower or 'saudi arabia' in location_lower or 'ksa' in location_lower:
                country = 'saudi_arabia'
            elif 'uae' in location_lower or 'united arab emirates' in location_lower or 'dubai' in location_lower or 'abu dhabi' in location_lower:
                country = 'uae'
            elif 'middle east' in location_lower or 'gulf' in location_lower or 'gcc' in location_lower:
                country = 'middle_east'
            elif 'africa' in location_lower:
                country = 'africa'
            elif 'latin' in location_lower or 'mexico' in location_lower or 'brazil' in location_lower:
                country = 'latin_america'
            elif 'europe' in location_lower or any(eu in location_lower for eu in ['france', 'germany', 'italy', 'spain']):
                country = 'europe'
        
        # Map countries to model descriptions (culturally sensitive and diverse)
        model_descriptions = {
            'usa': 'diverse American',
            'uk': 'British',
            'india': 'South Asian',
            'pakistan': 'South Asian',
            'china': 'East Asian',
            'japan': 'Japanese',
            'korea': 'Korean',
            'saudi_arabia': 'Saudi Arabian, Middle Eastern, Arab features, olive skin tone, dark hair, well-groomed beard',
            'uae': 'Emirati, Middle Eastern, Arab features, olive skin tone, dark hair',
            'middle_east': 'Middle Eastern, Arab features, olive to tan skin tone, dark hair',
            'africa': 'African',
            'latin_america': 'Latin American',
            'europe': 'European',
        }
        
        if country and country in model_descriptions:
            return model_descriptions[country]
        
        return "diverse, professional"

