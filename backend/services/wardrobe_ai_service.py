"""AI Service for analyzing wardrobe items and extracting properties"""
import json
from typing import Optional, Dict
from fastapi import HTTPException

import openai


class WardrobeAIService:
    """Service for AI-powered wardrobe item analysis"""
    
    def __init__(self, api_key: str):
        """
        Initialize Wardrobe AI Service
        
        Args:
            api_key: OpenAI API key
        """
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.max_tokens = 1000
        self.temperature = 0.1  # Low temperature for consistent extraction
    
    def extract_item_properties(self, image_base64: str) -> Dict[str, Optional[str]]:
        """
        Analyze a clothing image and extract all relevant properties
        
        Args:
            image_base64: Base64 encoded image of the clothing item
            
        Returns:
            Dictionary with extracted properties:
            - category: Clothing category (shirt, trouser, blazer, etc.)
            - name: Item name/description
            - color: Primary color
            - brand: Brand name (if visible)
            - style: Style description
            - material: Material/fabric type
            - pattern: Pattern type (solid, striped, checked, etc.)
            - size_estimate: Estimated size (if determinable)
            - condition: Condition estimate (new, good, fair, poor)
            
        Raises:
            HTTPException: If API call fails
        """
        analysis_prompt = """
You are a fashion expert analyzing a clothing item from a user's photo. Extract the essential details.

Analyze the image and provide a JSON response with the following structure:
{
    "category": "exact category - MUST be one of: shirt, trouser, blazer, jacket, shoes, belt, tie, suit, sweater, polo, t_shirt, jeans, shorts, or other",
    "color": "primary color with SPECIFIC shade (e.g., 'Navy blue', 'Charcoal gray', 'Burgundy red', 'Black', 'White') - be precise, not generic",
    "description": "style description including: fit (classic, slim, relaxed), formality (formal, casual, business casual), pattern (solid, striped, checked, plaid), and any distinctive style features. Keep it concise but descriptive (2-3 sentences max)."
}

CRITICAL RULES:
1. Category MUST be exactly one of: shirt, trouser, blazer, jacket, shoes, belt, tie, suit, sweater, polo, t_shirt, jeans, shorts, other
2. Color must be SPECIFIC with shade (e.g., "Navy blue" not "blue", "Charcoal gray" not "gray", "Burgundy red" not "red")
3. Description should include: style/fit, formality level, pattern if any, and key style features
4. Keep description concise but informative (2-3 sentences)
5. Return ONLY valid JSON, no additional text, no markdown, no code blocks

Example response:
{
    "category": "shirt",
    "color": "Navy blue",
    "description": "Classic fit oxford shirt with button-down collar. Business casual style, solid color. Suitable for professional and smart casual occasions."
}

Respond with ONLY the JSON object.
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
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                response_format={"type": "json_object"}  # Force JSON response
            )
            
            # Parse JSON response
            content = response.choices[0].message.content
            properties = json.loads(content)
            
            # Validate and clean up the response
            cleaned_properties = self._validate_and_clean_properties(properties)
            # Add model information (must be added after cleaning)
            cleaned_properties["model_used"] = "OpenAI GPT-4o"
            print(f"✅ Returning properties with model_used: {cleaned_properties.get('model_used')}")
            return cleaned_properties
            
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse AI response: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error analyzing wardrobe item: {str(e)}"
            )
    
    def _validate_and_clean_properties(self, properties: Dict) -> Dict[str, Optional[str]]:
        """
        Validate and clean extracted properties
        
        Args:
            properties: Raw properties from AI
            
        Returns:
            Cleaned and validated properties (only category, color, description)
        """
        valid_categories = [
            'shirt', 'trouser', 'blazer', 'jacket', 'shoes', 'belt',
            'tie', 'suit', 'sweater', 'polo', 't_shirt', 'jeans', 'shorts', 'other'
        ]
        
        # Ensure category is valid
        category = properties.get('category', '').lower()
        if category not in valid_categories:
            # Try to map common variations
            category_map = {
                'pants': 'trouser',
                'pant': 'trouser',
                'trousers': 'trouser',
                'coat': 'jacket',
                'sport coat': 'blazer',
                'sportcoat': 'blazer',
                'dress shirt': 'shirt',
                'button down': 'shirt',
                'button-down': 'shirt',
            }
            category = category_map.get(category, 'other')
        
        # Clean and format properties - only keep essential fields
        cleaned = {
            'category': category,
            'color': properties.get('color') or None,
            'description': properties.get('description') or None,
        }
        
        # Build description if not provided
        if not cleaned['description']:
            cleaned['description'] = f"{cleaned['category'].capitalize()} item"
        
        # Ensure color is provided
        if not cleaned['color']:
            cleaned['color'] = 'Unknown'
        
        return cleaned

