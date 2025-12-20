"""AI Service for outfit suggestions and image generation using OpenAI"""
import json
import base64
from typing import Optional, Tuple

import openai
from fastapi import HTTPException

from models.outfit import OutfitSuggestion


class AIService:
    """Service for interacting with OpenAI API"""
    
    def __init__(self, api_key: str):
        """
        Initialize AI Service
        
        Args:
            api_key: OpenAI API key
        """
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.max_tokens = 1000
        self.temperature = 0.7
    
    def get_outfit_suggestion(
        self, 
        image_base64: str, 
        text_input: str = ""
    ) -> OutfitSuggestion:
        """
        Get outfit suggestion from OpenAI based on image analysis
        
        Args:
            image_base64: Base64 encoded image
            text_input: Additional context or preferences
            
        Returns:
            OutfitSuggestion object
            
        Raises:
            HTTPException: If API call fails
        """
        prompt = self._build_prompt(text_input)
        
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
            
            # Extract and parse the response
            content = response.choices[0].message.content
            return self._parse_response(content)
            
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Error calling OpenAI API: {str(e)}"
            )
    
    def _build_prompt(self, text_input: str = "") -> str:
        """
        Build the prompt for OpenAI API
        
        Args:
            text_input: Additional context from user
            
        Returns:
            Formatted prompt string
        """
        prompt = """
You are a professional fashion stylist. Analyze the uploaded image of a shirt or blazer and provide a complete outfit suggestion.

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

Respond in JSON format with the following structure:
{{
    "shirt": "detailed description of the shirt",
    "trouser": "detailed description of the trousers/pants",
    "blazer": "detailed description of the blazer/jacket",
    "shoes": "detailed description of the shoes",
    "belt": "detailed description of the belt",
    "reasoning": "brief explanation of why this outfit works well together"
}}
""".format(context=f"Additional context: {text_input}" if text_input else "")
        
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
            
            return OutfitSuggestion(
                shirt=outfit_data.get("shirt", "Classic white dress shirt"),
                trouser=outfit_data.get("trouser", "Dark navy dress trousers"),
                blazer=outfit_data.get("blazer", "Charcoal gray blazer"),
                shoes=outfit_data.get("shoes", "Black leather dress shoes"),
                belt=outfit_data.get("belt", "Black leather belt"),
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
        location_details: Optional[dict] = None
    ) -> str:
        """
        Generate an image of a male model wearing the recommended outfit.
        The model's appearance is customized based on geographical location.
        If uploaded_image_base64 is provided, the exact clothing from the image will be preserved.
        
        Args:
            outfit_suggestion: The outfit recommendation to visualize
            uploaded_image_base64: Base64 encoded image of the uploaded clothing (optional)
            location: User's location (e.g., "New York, USA", "London, UK")
            location_details: Optional dict with location info (country, region, etc.)
            
        Returns:
            Base64 encoded image of the model wearing the outfit
            
        Raises:
            HTTPException: If image generation fails
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
            
            return image_base64
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error generating model image: {str(e)}"
            )
    
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
- Blazer/Jacket: {outfit.blazer} (worn over the shirt)
- Trousers: {outfit.trouser}
- Dress Shoes: {outfit.shoes}
- Belt: {outfit.belt}

MANDATORY:
1. The shirt is the TOP PRIORITY - it must match the description EXACTLY
2. Colors must match EXACTLY - no variations or "close enough" colors
3. Show complete outfit: shirt + blazer + trousers + shoes (all visible)
4. Full body shot from head to feet
5. Professional fashion photography quality
""".strip()
        else:
            # No uploaded clothing - use ChatGPT's full recommendation
            prompt = f"""
Fashion photo: {model_description} male model, full body head to toe, studio background.

COMPLETE OUTFIT:
- Shirt: {outfit.shirt}
- Blazer: {outfit.blazer}
- Trousers: {outfit.trouser}
- Shoes: {outfit.shoes}
- Belt: {outfit.belt}

Show all items clearly. Full body shot with visible shoes. Professional quality.
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

