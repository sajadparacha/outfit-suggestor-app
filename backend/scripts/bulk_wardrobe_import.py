#!/usr/bin/env python3
"""
Bulk import wardrobe items from a folder of images.

Uses the local Hugging Face model (BLIP or ViT-GPT2) to analyze each image,
extract category, color, and description, then inserts into the wardrobe database.

Requirements:
  - Run from repo root or backend: python backend/scripts/bulk_wardrobe_import.py ...
  - DATABASE_URL set (or default local Postgres)
  - User must exist (create via app signup if needed)
  - Optional: pip install transformers torch (for local model)

Usage:
  python backend/scripts/bulk_wardrobe_import.py --images-dir ./my_wardrobe_photos --user me@example.com
  python backend/scripts/bulk_wardrobe_import.py --images-dir ./photos --user 1 --model vit-gpt2 --dry-run
"""

from __future__ import annotations

import argparse
import os
import sys

# Ensure backend root is on path when run as script
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_ROOT = os.path.dirname(_SCRIPT_DIR)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

# Supported image extensions
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}


def encode_image_from_path(image_path: str, max_size: int = 1024) -> str:
    """Read image from path and return base64 JPEG string (same logic as API)."""
    import base64
    import io
    from PIL import Image

    image = Image.open(image_path)
    if image.mode != "RGB":
        image = image.convert("RGB")
    if image.width > max_size or image.height > max_size:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def find_user(db, user_spec: str):
    """Resolve user by email or numeric id."""
    from models.user import User

    user_spec = user_spec.strip()
    if user_spec.isdigit():
        user = db.query(User).filter(User.id == int(user_spec)).first()
    else:
        user = db.query(User).filter(User.email == user_spec).first()
    return user


def collect_image_paths(images_dir: str) -> list[str]:
    """Return list of image file paths in directory (non-recursive)."""
    paths = []
    for name in os.listdir(images_dir):
        base, ext = os.path.splitext(name)
        if ext.lower() in IMAGE_EXTENSIONS:
            paths.append(os.path.join(images_dir, name))
    return sorted(paths)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bulk import wardrobe items from images using a local vision model."
    )
    parser.add_argument(
        "--images-dir",
        required=True,
        help="Directory containing images of wardrobe items (e.g. ./wardrobe_photos)",
    )
    parser.add_argument(
        "--user",
        required=True,
        help="User to assign items to: email (e.g. me@example.com) or user id (e.g. 1)",
    )
    parser.add_argument(
        "--model",
        choices=["blip", "vit-gpt2"],
        default="blip",
        help="Local model for image analysis (default: blip)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only analyze and print results; do not insert into database",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max number of images to process (0 = no limit)",
    )
    args = parser.parse_args()

    images_dir = os.path.abspath(args.images_dir)
    if not os.path.isdir(images_dir):
        print(f"Error: Not a directory: {images_dir}")
        return 1

    image_paths = collect_image_paths(images_dir)
    if not image_paths:
        print(f"No image files found in {images_dir} (extensions: {', '.join(IMAGE_EXTENSIONS)})")
        return 1

    if args.limit:
        image_paths = image_paths[: args.limit]
    print(f"Found {len(image_paths)} image(s). Model: {args.model}. Dry-run: {args.dry_run}")

    # Local model: WardrobeAIServiceHF with no token => local inference
    try:
        from services.wardrobe_ai_service_hf import WardrobeAIServiceHF
    except ImportError as e:
        print("Error: Could not import WardrobeAIServiceHF. Install: pip install transformers torch")
        return 1

    hf_service = WardrobeAIServiceHF(hf_api_token=None, model_type=args.model)

    db = None
    if not args.dry_run:
        from models.database import SessionLocal
        from services.wardrobe_service import WardrobeService

        db = SessionLocal()
        user = find_user(db, args.user)
        if not user:
            print(f"Error: No user found for: {args.user}")
            db.close()
            return 1
        wardrobe_service = WardrobeService()
        print(f"Adding items for user: {user.email} (id={user.id})")

    success = 0
    errors = 0
    for path in image_paths:
        name = os.path.basename(path)
        try:
            image_base64 = encode_image_from_path(path)
            properties = hf_service.extract_item_properties(image_base64)
            category = properties.get("category", "other")
            color = properties.get("color") or "Unknown"
            description = properties.get("description") or f"{category} item"

            if args.dry_run:
                print(f"  [{name}] category={category} color={color} description={description[:60]}...")
                success += 1
                continue

            wardrobe_item = wardrobe_service.add_wardrobe_item(
                db=db,
                user_id=user.id,
                category=category,
                color=color,
                description=description,
                image_data=image_base64,
            )
            print(f"  Added: {name} -> id={wardrobe_item.id} ({category}, {color})")
            success += 1
        except Exception as e:
            print(f"  Error processing {name}: {e}")
            errors += 1

    if db:
        db.close()

    print(f"Done: {success} imported, {errors} errors.")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
