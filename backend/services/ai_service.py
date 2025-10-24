"""AI Service for outfit suggestions using OpenAI"""
import json
import openai
from fastapi import HTTPException
from typing import Optional

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

