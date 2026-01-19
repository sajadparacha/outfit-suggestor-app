"""Cost calculation utilities for AI API calls"""
from typing import Optional, Dict


class CostCalculator:
    """Calculate costs for AI API calls in USD"""
    
    # OpenAI GPT-4o pricing (as of 2024)
    GPT4O_INPUT_COST_PER_1M = 2.50  # $2.50 per 1M input tokens
    GPT4O_OUTPUT_COST_PER_1M = 10.00  # $10.00 per 1M output tokens
    
    # GPT-4 Vision pricing (for image analysis)
    # Standard quality: 85 tokens per image
    # High quality: 170 tokens per image
    GPT4_VISION_IMAGE_COST = 0.01  # ~$0.01 per image (85 tokens at $2.50/1M = $0.0002, but simplified)
    
    # DALL-E 3 pricing
    DALLE3_STANDARD_COST = 0.04  # $0.04 per 1024x1024 image
    DALLE3_HD_COST = 0.08  # $0.08 per 1024x1792 or 1792x1024 image
    
    # Stable Diffusion via Replicate (approximate)
    STABLE_DIFFUSION_COST = 0.0023  # ~$0.0023 per image generation
    
    # Nano Banana pricing (approximate, varies)
    NANO_BANANA_COST = 0.001  # ~$0.001 per image (approximate)
    
    @staticmethod
    def calculate_gpt4_cost(
        input_tokens: int,
        output_tokens: int,
        has_image: bool = False
    ) -> float:
        """
        Calculate cost for GPT-4 API call
        
        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            has_image: Whether the request includes an image
            
        Returns:
            Cost in USD
        """
        # Calculate base token costs
        input_cost = (input_tokens / 1_000_000) * CostCalculator.GPT4O_INPUT_COST_PER_1M
        output_cost = (output_tokens / 1_000_000) * CostCalculator.GPT4O_OUTPUT_COST_PER_1M
        
        # Add image cost if applicable (for vision models)
        image_cost = CostCalculator.GPT4_VISION_IMAGE_COST if has_image else 0.0
        
        total = input_cost + output_cost + image_cost
        return round(total, 6)
    
    @staticmethod
    def calculate_dalle3_cost(
        size: str = "1024x1024",
        quality: str = "standard"
    ) -> float:
        """
        Calculate cost for DALL-E 3 image generation
        
        Args:
            size: Image size (1024x1024, 1024x1792, 1792x1024)
            quality: Image quality (standard, hd)
            
        Returns:
            Cost in USD
        """
        if size == "1024x1024":
            return CostCalculator.DALLE3_STANDARD_COST
        elif quality == "hd":
            return CostCalculator.DALLE3_HD_COST
        else:
            return CostCalculator.DALLE3_STANDARD_COST
    
    @staticmethod
    def calculate_stable_diffusion_cost() -> float:
        """
        Calculate cost for Stable Diffusion image generation via Replicate
        
        Returns:
            Cost in USD
        """
        return CostCalculator.STABLE_DIFFUSION_COST
    
    @staticmethod
    def calculate_nano_banana_cost() -> float:
        """
        Calculate cost for Nano Banana image generation
        
        Returns:
            Cost in USD
        """
        return CostCalculator.NANO_BANANA_COST
    
    @staticmethod
    def calculate_model_image_cost(model: str = "dalle3", size: str = "1024x1024") -> float:
        """
        Calculate cost for model image generation
        
        Args:
            model: Image generation model (dalle3, stable-diffusion, nano-banana)
            size: Image size (for DALL-E 3)
            
        Returns:
            Cost in USD
        """
        if model == "dalle3":
            return CostCalculator.calculate_dalle3_cost(size)
        elif model == "stable-diffusion":
            return CostCalculator.calculate_stable_diffusion_cost()
        elif model == "nano-banana":
            return CostCalculator.calculate_nano_banana_cost()
        else:
            return 0.0
    
    @staticmethod
    def format_cost(cost: float) -> str:
        """
        Format cost as USD string
        
        Args:
            cost: Cost in USD
            
        Returns:
            Formatted string (e.g., "$0.01" or "$0.001")
        """
        if cost < 0.01:
            return f"${cost:.4f}"
        elif cost < 0.10:
            return f"${cost:.3f}"
        else:
            return f"${cost:.2f}"
