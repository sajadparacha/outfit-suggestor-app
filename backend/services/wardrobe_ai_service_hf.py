"""AI Service for analyzing wardrobe items using Hugging Face (FREE)"""
import json
import base64
import io
from typing import Optional, Dict
from fastapi import HTTPException
import requests
from PIL import Image


class WardrobeAIServiceHF:
    """Service for AI-powered wardrobe item analysis using Hugging Face (FREE)"""
    
    def __init__(self, hf_api_token: Optional[str] = None, model_type: str = "blip"):
        """
        Initialize Wardrobe AI Service with Hugging Face
        
        Args:
            hf_api_token: Optional Hugging Face API token (for Inference API)
                          If None, will use local transformers library
            model_type: Model type to use - "blip" or "vit-gpt2"
        """
        self.hf_api_token = hf_api_token
        self.use_inference_api = hf_api_token is not None
        self.model_type = model_type.lower()
        
        # Model choices:
        if self.model_type == "vit-gpt2" or self.model_type == "vit_gpt2":
            self.caption_model = "nlpconnect/vit-gpt2-image-captioning"
            self.model_name_display = "ViT-GPT2 Image Captioning"
        else:  # Default to BLIP
            self.caption_model = "Salesforce/blip-image-captioning-base"
            self.model_name_display = "BLIP"
        
        self.classification_model = "google/vit-base-patch16-224"
        
        # Initialize local models if not using Inference API
        if not self.use_inference_api:
            try:
                import torch
                
                if self.model_type == "vit-gpt2" or self.model_type == "vit_gpt2":
                    from transformers import VisionEncoderDecoderModel, ViTImageProcessor, AutoTokenizer
                    
                    print(f"🔄 Loading {self.model_name_display} model locally (this may take a minute)...")
                    self.processor = ViTImageProcessor.from_pretrained(self.caption_model)
                    self.tokenizer = AutoTokenizer.from_pretrained(self.caption_model)
                    self.caption_model_local = VisionEncoderDecoderModel.from_pretrained(self.caption_model)
                    self.device = "cuda" if torch.cuda.is_available() else "cpu"
                    self.caption_model_local.to(self.device)
                    print(f"✅ {self.model_name_display} model loaded on {self.device}")
                else:  # BLIP
                    from transformers import BlipProcessor, BlipForConditionalGeneration
                    
                    print(f"🔄 Loading {self.model_name_display} model locally (this may take a minute)...")
                    self.processor = BlipProcessor.from_pretrained(self.caption_model)
                    self.caption_model_local = BlipForConditionalGeneration.from_pretrained(self.caption_model)
                    self.device = "cuda" if torch.cuda.is_available() else "cpu"
                    self.caption_model_local.to(self.device)
                    print(f"✅ {self.model_name_display} model loaded on {self.device}")
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="transformers library not installed. Run: pip install transformers torch pillow"
                )
    
    def extract_item_properties(self, image_base64: str) -> Dict[str, Optional[str]]:
        """
        Analyze a clothing image and extract properties using Hugging Face
        
        Args:
            image_base64: Base64 encoded image of the clothing item
            
        Returns:
            Dictionary with extracted properties:
            - category: Clothing category (shirt, trouser, blazer, etc.)
            - color: Primary color with specific shade
            - description: Style description including fit, formality, pattern
            
        Raises:
            HTTPException: If API call fails
        """
        try:
            # Decode base64 image
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            if self.use_inference_api:
                # Use Hugging Face Inference API (FREE tier: 1000 requests/month)
                return self._extract_with_inference_api(image)
            else:
                # Use local model
                return self._extract_with_local_model(image)
                
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error analyzing wardrobe item with Hugging Face: {str(e)}"
            )
    
    def _extract_with_inference_api(self, image: Image.Image) -> Dict[str, Optional[str]]:
        """Extract properties using Hugging Face Inference API"""
        # Convert image to base64 for API
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Get image caption/description
        api_url = f"https://api-inference.huggingface.co/models/{self.caption_model}"
        headers = {
            "Authorization": f"Bearer {self.hf_api_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": img_base64,
            "parameters": {
                "max_length": 100,
                "num_beams": 3
            }
        }
        
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Hugging Face API error: {response.text}"
            )
        
        result = response.json()
        caption = result[0].get("generated_text", "") if isinstance(result, list) else ""
        
        # Parse caption to extract category, color, and description
        return self._parse_caption_to_properties(caption, image)
    
    def _extract_with_local_model(self, image: Image.Image) -> Dict[str, Optional[str]]:
        """Extract properties using local model (BLIP or ViT-GPT2)"""
        import torch
        
        if self.model_type == "vit-gpt2" or self.model_type == "vit_gpt2":
            # Use ViT-GPT2 model
            pixel_values = self.processor(images=image, return_tensors="pt").pixel_values.to(self.device)
            
            with torch.no_grad():
                generated_ids = self.caption_model_local.generate(pixel_values, max_length=100, num_beams=3)
            
            caption = self.tokenizer.decode(generated_ids[0], skip_special_tokens=True)
        else:
            # Use BLIP model
            inputs = self.processor(image, return_tensors="pt").to(self.device)
            
            with torch.no_grad():
                out = self.caption_model_local.generate(**inputs, max_length=100, num_beams=3)
            
            caption = self.processor.decode(out[0], skip_special_tokens=True)
        
        # Parse caption to extract properties
        return self._parse_caption_to_properties(caption, image)
    
    def _parse_caption_to_properties(self, caption: str, image: Image.Image) -> Dict[str, Optional[str]]:
        """
        Parse AI-generated caption into structured properties
        
        This is a simple parser - you can enhance it with more sophisticated NLP
        """
        caption_lower = caption.lower()
        
        # Extract category
        category = self._extract_category(caption_lower)
        
        # Extract color (simple keyword matching - can be improved)
        color = self._extract_color(caption_lower)
        
        # Use caption as description (can be refined)
        description = self._refine_description(caption, category, color)
        
        if self.use_inference_api:
            model_name = f"Hugging Face {self.model_name_display} (Inference API)"
        else:
            model_name = f"Hugging Face {self.model_name_display} (Local)"
        
        result = {
            "category": category,
            "color": color,
            "description": description,
            "model_used": model_name
        }
        print(f"✅ Returning properties with model_used: {result.get('model_used')}")
        return result
    
    def _extract_category(self, text: str) -> str:
        """Extract clothing category from text"""
        categories = {
            "shirt": ["shirt", "top", "blouse", "t-shirt", "tshirt"],
            "trouser": ["pants", "trousers", "jeans", "trouser", "pant"],
            "blazer": ["blazer", "suit jacket", "sport coat", "jacket"],
            "jacket": ["jacket", "coat"],
            "shoes": ["shoes", "sneakers", "boots", "footwear"],
            "belt": ["belt"],
            "tie": ["tie", "necktie"],
            "suit": ["suit"],
            "sweater": ["sweater", "pullover"],
            "polo": ["polo"],
            "t_shirt": ["t-shirt", "tshirt", "tee"],
            "jeans": ["jeans"],
            "shorts": ["shorts"],
            "other": []
        }
        
        for cat, keywords in categories.items():
            if any(keyword in text for keyword in keywords):
                return cat
        
        return "other"
    
    def _extract_color(self, text: str) -> str:
        """Extract color from text"""
        colors = [
            "black", "white", "gray", "grey", "navy", "blue", "red", "green",
            "yellow", "orange", "purple", "pink", "brown", "beige", "tan",
            "burgundy", "maroon", "charcoal", "olive", "khaki"
        ]
        
        for color in colors:
            if color in text:
                # Capitalize first letter
                return color.capitalize()
        
        return "Unknown"
    
    def _refine_description(self, caption: str, category: str, color: str) -> str:
        """Refine the description to include style information"""
        # Start with the caption
        description = caption
        
        # Add category and color if not already mentioned
        if category and category not in description.lower():
            description = f"{category.capitalize()}, {description}"
        
        if color and color.lower() not in description.lower():
            description = f"{color} {description}"
        
        # Enhance with style keywords if detected
        style_keywords = {
            "formal": ["formal", "dress", "business", "professional"],
            "casual": ["casual", "everyday", "relaxed"],
            "slim": ["slim", "fitted", "tailored"],
            "classic": ["classic", "traditional"],
            "modern": ["modern", "contemporary"]
        }
        
        detected_styles = []
        for style, keywords in style_keywords.items():
            if any(kw in description.lower() for kw in keywords):
                detected_styles.append(style)
        
        if detected_styles:
            description += f". Style: {', '.join(detected_styles)}"
        
        return description.strip()

