"""AI Service for analyzing wardrobe items and extracting properties"""
import hashlib
import json
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException

import openai

FIT_RANK_CACHE_SIZE = 256
FIT_RANK_DESCRIPTION_CHARS = 160
FIT_RANK_PROMPT_VERSION = "v4"

FIT_RANK_SYSTEM_PROMPT = """You are a practical menswear stylist. Given one CANDIDATE clothing item and a
list of items the user OWNS, score how well each owned item works worn in the same outfit as the candidate.

Ask: "Would a reasonably well-dressed person wear these two together in real life?"
- Judge color harmony, pattern mixing, and formality compatibility.
- The user's goal is context, not a hard filter. Smart-casual and business-casual outfits commonly
  include clean sneakers, chinos, overshirts, and casual jackets.
- Neutral color alone does not make a good pairing.
- If an owned item's text does not describe a clothing item, score it 0.

Scoring: 8-10 great pairing, 6-7 works well, 3-5 possible but not ideal, 0-2 does not work.

Return ONLY compact JSON. "scores" has an entry for EVERY owned item. "reasons" only for items
scoring 3 or more, max 8 words each:
{"scores": {"<id>": <integer 0-10>}, "reasons": {"<id>": "<max 8 words>"}}

Use only ids from the OWNED list."""


class WardrobeAIService:
    """Service for AI-powered wardrobe item analysis"""
    
    def __init__(
        self,
        api_key: str,
        fit_model: str = "gpt-4o-mini",
        fit_timeout_seconds: float = 20.0,
    ):
        """
        Initialize Wardrobe AI Service
        
        Args:
            api_key: OpenAI API key
            fit_model: Model used to rank "How this fits" pairings
            fit_timeout_seconds: Request timeout for pairing ranking
        """
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.max_tokens = 1000
        self.temperature = 0.1  # Low temperature for consistent extraction
        self.fit_model = fit_model
        self.fit_timeout_seconds = fit_timeout_seconds
        self._fit_cache: "OrderedDict[str, List[Dict[str, Any]]]" = OrderedDict()

    def rank_pairings(
        self,
        candidate: Dict[str, Any],
        owned_items: List[Dict[str, Any]],
        goal: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Rank which owned items pair well with a candidate (text only, no images).

        Returns a score for every item the model rated: [{"id", "score", "reason"}].
        Callers must validate ids and apply score thresholds.
        Raises on API / parse failure so callers can fall back to rule scoring.
        """
        payload = {
            "goal": goal,
            "candidate": self._fit_item_text(candidate),
            "owned": [self._fit_item_text(item) for item in owned_items],
        }
        user_content = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        cache_key = hashlib.sha256(
            f"{self.fit_model}|{FIT_RANK_PROMPT_VERSION}|{user_content}".encode()
        ).hexdigest()
        cached = self._fit_cache.get(cache_key)
        if cached is not None:
            self._fit_cache.move_to_end(cache_key)
            return cached

        # No automatic retries: a timed-out ranking falls back to rules instead of
        # multiplying the user's wait.
        client = self.client.with_options(timeout=self.fit_timeout_seconds, max_retries=0)
        response = client.chat.completions.create(
            model=self.fit_model,
            messages=[
                {"role": "system", "content": FIT_RANK_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_tokens=1500,
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        pairs = self._parse_fit_ranking(parsed)

        self._fit_cache[cache_key] = pairs
        if len(self._fit_cache) > FIT_RANK_CACHE_SIZE:
            self._fit_cache.popitem(last=False)
        return pairs

    @staticmethod
    def _parse_fit_ranking(parsed: Any) -> List[Dict[str, Any]]:
        """Accept {"scores": {id: n}, "reasons": {id: s}} or legacy {"pairs": [...]}."""
        if not isinstance(parsed, dict):
            raise ValueError("AI pairing response is not an object")

        rows: List[Tuple[Any, Any, Any]] = []
        scores = parsed.get("scores")
        if isinstance(scores, dict):
            reasons = parsed.get("reasons") if isinstance(parsed.get("reasons"), dict) else {}
            rows = [(k, v, reasons.get(k)) for k, v in scores.items()]
        elif isinstance(parsed.get("pairs"), list):
            rows = [
                (r.get("id"), r.get("score", 0), r.get("reason"))
                for r in parsed["pairs"]
                if isinstance(r, dict)
            ]
        else:
            raise ValueError("AI pairing response missing 'scores'")

        pairs: List[Dict[str, Any]] = []
        for raw_id, raw_score, reason in rows:
            try:
                item_id = int(raw_id)
                score = float(raw_score)
            except (TypeError, ValueError):
                continue
            pairs.append(
                {
                    "id": item_id,
                    "score": score,
                    "reason": reason.strip()[:120] if isinstance(reason, str) and reason.strip() else None,
                }
            )
        return pairs

    @staticmethod
    def _fit_item_text(item: Dict[str, Any]) -> Dict[str, Any]:
        description = (item.get("description") or "").strip()
        out: Dict[str, Any] = {
            "category": item.get("category") or "other",
            "color": item.get("color") or "",
            "description": description[:FIT_RANK_DESCRIPTION_CHARS],
        }
        if item.get("id") is not None:
            out["id"] = item["id"]
        if item.get("name"):
            out["name"] = str(item["name"])[:60]
        return out
    
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

