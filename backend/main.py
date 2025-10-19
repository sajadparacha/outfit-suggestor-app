from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import base64
import io
from PIL import Image
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="AI Outfit Suggestor API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "https://sajadparacha.github.io"  # GitHub Pages URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class OutfitSuggestion(BaseModel):
    shirt: str
    trouser: str
    blazer: str
    shoes: str
    belt: str
    reasoning: str

def encode_image(image_file):
    """Convert image file to base64 string for OpenAI API"""
    image = Image.open(image_file)
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize if too large (OpenAI has size limits)
    max_size = 1024
    if image.width > max_size or image.height > max_size:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    
    # Convert to base64
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def get_outfit_suggestion(image_base64: str, text_input: str = "") -> OutfitSuggestion:
    """Call OpenAI GPT-4 Vision API to get outfit suggestion"""
    
    # Prepare the prompt
    prompt = f"""
    You are a professional fashion stylist. Analyze the uploaded image of a shirt or blazer and provide a complete outfit suggestion.

    {f"Additional context: {text_input}" if text_input else ""}

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
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
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
            max_tokens=1000,
            temperature=0.7
        )
        
        # Extract the response content
        content = response.choices[0].message.content
        
        # Try to parse JSON from the response
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
                reasoning=outfit_data.get("reasoning", "A classic professional look that works for most business occasions.")
            )
        except (json.JSONDecodeError, KeyError) as e:
            # Fallback if JSON parsing fails
            return OutfitSuggestion(
                shirt="Classic white dress shirt",
                trouser="Dark navy dress trousers", 
                blazer="Charcoal gray blazer",
                shoes="Black leather dress shoes",
                belt="Black leather belt",
                reasoning="A professional outfit suggestion based on your uploaded image."
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling OpenAI API: {str(e)}")

@app.get("/")
async def root():
    return {"message": "AI Outfit Suggestor API is running!"}

@app.post("/api/suggest-outfit", response_model=OutfitSuggestion)
async def suggest_outfit(
    image: UploadFile = File(...),
    text_input: str = Form("")
):
    """
    Analyze an uploaded image and provide outfit suggestions
    """
    try:
        # Validate image file
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Check file size (limit to 10MB)
        if image.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large. Please upload an image smaller than 10MB")
        
        # Encode image to base64
        image_base64 = encode_image(image.file)
        
        # Get outfit suggestion from OpenAI
        suggestion = get_outfit_suggestion(image_base64, text_input)
        
        return suggestion
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
