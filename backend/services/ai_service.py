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
        location: Optional[str] = None,
        location_details: Optional[dict] = None
    ) -> str:
        """
        Generate an image of a male model wearing the recommended outfit.
        The model's appearance is customized based on geographical location.
        
        Args:
            outfit_suggestion: The outfit recommendation to visualize
            location: User's location (e.g., "New York, USA", "London, UK")
            location_details: Optional dict with location info (country, region, etc.)
            
        Returns:
            Base64 encoded image of the model wearing the outfit
            
        Raises:
            HTTPException: If image generation fails
        """
        # Build prompt for DALL-E based on outfit and location
        prompt = self._build_model_image_prompt(outfit_suggestion, location, location_details)
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
    
    def _build_model_image_prompt(
        self,
        outfit: OutfitSuggestion,
        location: Optional[str] = None,
        location_details: Optional[dict] = None
    ) -> str:
        """
        Build a detailed prompt for DALL-E to generate a model image.
        
        Args:
            outfit: Outfit suggestion details
            location: User's location string
            location_details: Additional location information
            
        Returns:
            Formatted prompt for DALL-E
        """
        # Build location-based model description
        model_description = self._get_location_based_model_description(location, location_details)
        
        # Build outfit description
        outfit_description = f"""
        Wearing:
        - {outfit.shirt}
        - {outfit.trouser}
        - {outfit.blazer}
        - {outfit.shoes}
        - {outfit.belt}
        """.strip()
        
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

