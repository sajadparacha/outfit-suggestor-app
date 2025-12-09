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
        clothing_details = None
        if uploaded_image_base64:
            print("🔍 Analyzing uploaded image to preserve exact clothing features...")
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
            # Generate image using DALL-E 3
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                size="1024x1024",
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
        CRITICAL TASK: Analyze this clothing image with EXTREME precision. Your description will be used to recreate this EXACT item, so every detail matters.
        
        You must provide a COMPLETE, DETAILED description that allows someone to recreate this clothing item with 100% visual accuracy.
        
        STRUCTURE YOUR RESPONSE AS FOLLOWS:
        
        1. ITEM TYPE: 
           State exactly what type of clothing this is (e.g., "dress shirt", "blazer", "sport coat", "polo shirt", "t-shirt", "sweater")
        
        2. EXACT COLORS (BE PRECISE):
           - Primary color: Use specific color names (e.g., "navy blue", "burgundy", "charcoal gray", "forest green", NOT generic "blue" or "red")
           - If multiple colors: List each color specifically
           - Color shade/intensity: Describe the exact shade (e.g., "deep navy", "light blue", "dark charcoal", "bright red")
           - Any color gradients or variations: Describe exactly how colors transition
        
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
        - Describe ONLY what you actually see - do not infer or assume
        - Use SPECIFIC color names - avoid generic terms
        - Be PRECISE about patterns - include measurements, spacing, directions
        - Include ALL visible details - nothing is too small to mention
        - Do NOT suggest improvements, changes, or alternatives
        - Do NOT generalize - be specific about every aspect
        - If uncertain about a detail, describe what you can clearly see
        
        Your description must be detailed enough that someone could recreate this EXACT clothing item just from your words.
        Be thorough, specific, and accurate.
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
                max_tokens=800,  # Increased for more detailed analysis
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
        
        # Build outfit description
        if exact_clothing_details:
            # Use exact clothing details from uploaded image analysis
            outfit_description = f"""
            ⚠️⚠️⚠️ ABSOLUTE CRITICAL REQUIREMENT - THIS IS THE MOST IMPORTANT INSTRUCTION ⚠️⚠️⚠️
            
            THE MODEL MUST WEAR THE EXACT SAME CLOTHING ITEM FROM THE USER'S UPLOADED PHOTO.
            DO NOT CREATE A SIMILAR ITEM. DO NOT CREATE A VARIATION. IT MUST BE IDENTICAL.
            
            EXACT CLOTHING ITEM SPECIFICATIONS (COPY EXACTLY - NO MODIFICATIONS ALLOWED):
            {exact_clothing_details}
            
            ⚠️ MANDATORY REQUIREMENTS - FOLLOW THESE EXACTLY:
            
            1. COLOR MATCHING (CRITICAL):
               - Use the EXACT colors specified in the description above
               - If the description says "navy blue", use NAVY BLUE, not "blue" or "dark blue"
               - If the description says "burgundy", use BURGUNDY, not "red" or "maroon"
               - Match the exact shade, tone, and intensity
               - NO COLOR VARIATIONS OR SUBSTITUTIONS ALLOWED
            
            2. PATTERN MATCHING (CRITICAL):
               - If it has stripes: Use the EXACT same stripe width, spacing, direction, and colors
               - If it has checks: Use the EXACT same check size, colors, and pattern
               - If it has plaid: Use the EXACT same plaid pattern, colors, and line thickness
               - If it's solid: Make it solid with NO patterns
               - NO PATTERN VARIATIONS OR MODIFICATIONS ALLOWED
            
            3. STYLE DETAILS (CRITICAL):
               - Match the EXACT collar type described
               - Match the EXACT button style, color, and placement
               - Match the EXACT pocket style and placement
               - Match the EXACT cuff style if visible
               - Match the EXACT lapel style if applicable
               - NO STYLE MODIFICATIONS ALLOWED
            
            4. MATERIAL/TEXTURE (CRITICAL):
               - Match the EXACT material appearance described
               - Match the EXACT texture (smooth, textured, matte, shiny)
               - Match the EXACT fabric weight appearance
               - NO MATERIAL VARIATIONS ALLOWED
            
            5. DISTINCTIVE FEATURES (CRITICAL):
               - Include ALL logos, emblems, or branding EXACTLY as described
               - Include ALL embroidery or decorative elements EXACTLY as described
               - Include ALL unique design elements EXACTLY as described
               - Include ANY text EXACTLY as shown
               - NO FEATURES SHOULD BE ADDED OR REMOVED
            
            ⚠️ ABSOLUTE PROHIBITIONS:
            - DO NOT create a "similar" or "inspired by" version
            - DO NOT improve, enhance, or modify the design
            - DO NOT use "close enough" colors or patterns
            - DO NOT add features that weren't in the original
            - DO NOT remove features that were in the original
            - DO NOT change the style, fit, or cut
            - THE CLOTHING MUST BE A PIXEL-PERFECT REPLICA IN TERMS OF APPEARANCE
            
            Complete the outfit with these additional items (these can be styled normally):
            - {outfit.trouser}
            - {outfit.shoes}
            - {outfit.belt}
            
            ⚠️ FINAL REMINDER: The uploaded clothing item description above is your EXACT blueprint. 
            Recreate it with 100% fidelity. Every color, pattern, detail, and feature must match exactly.
            This is more important than any other aspect of the image.
            """.strip()
        else:
            # Use general outfit description
            outfit_description = f"""
            Wearing:
            - {outfit.shirt}
            - {outfit.trouser}
            - {outfit.blazer}
            - {outfit.shoes}
            - {outfit.belt}
            """.strip()
        
        if exact_clothing_details:
            # Enhanced prompt when exact clothing must be preserved
            prompt = f"""
            {outfit_description}
            
            PHOTOGRAPHY SETUP:
            - Professional fashion photography of a {model_description} male model
            - Full body shot, standing in a modern studio setting with neutral background
            - Well-groomed model, confident pose
            - Professional lighting, high quality fashion photography style
            - Realistic and detailed
            - Model's appearance should authentically reflect the specified regional characteristics
            
            ⚠️ CRITICAL PRIORITY ORDER:
            1. FIRST PRIORITY (MOST IMPORTANT): The clothing item must match the exact specifications above with 100% accuracy
            2. SECOND PRIORITY: Complete the outfit with the additional items listed
            3. THIRD PRIORITY: Professional photography quality and model appearance
            
            REMEMBER: If there is any conflict between making the image look good and matching the exact clothing, 
            ALWAYS prioritize matching the exact clothing. The clothing accuracy is non-negotiable.
            """.strip()
        else:
            # Standard prompt when no exact clothing to preserve
            prompt = f"""
            Professional fashion photography of a {model_description} male model, 
            full body shot, standing in a modern studio setting with neutral background.
            {outfit_description}
            
            The model should be well-groomed, confident pose, professional lighting, 
            high quality fashion photography style, realistic and detailed.
            The model's appearance should authentically reflect the specified regional characteristics.
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

