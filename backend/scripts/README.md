# Backend scripts

## Bulk wardrobe import

`bulk_wardrobe_import.py` reads images from a folder, uses a **local** vision model (BLIP or ViT-GPT2) to describe and categorize each item, then inserts them into the wardrobe database.

### Requirements

- **Database**: Set `DATABASE_URL` (or use default `postgresql://...@localhost:5432/outfit_suggestor`).
- **User**: An existing user in the app (create one via the app signup if needed).
- **Local model**: `pip install transformers torch` (no Hugging Face API token required).

### Usage

From the **project root**:

```bash
# Import all images from a folder for user me@example.com (dry run first)
python backend/scripts/bulk_wardrobe_import.py --images-dir ./wardrobe_photos --user me@example.com --dry-run

# Actually insert into the database
python backend/scripts/bulk_wardrobe_import.py --images-dir ./wardrobe_photos --user me@example.com

# Use ViT-GPT2 instead of BLIP, and limit to 5 images
python backend/scripts/bulk_wardrobe_import.py --images-dir ./photos --user 1 --model vit-gpt2 --limit 5
```

From the **backend** directory:

```bash
cd backend
python scripts/bulk_wardrobe_import.py --images-dir ../wardrobe_photos --user me@example.com
```

### Options

| Option          | Description |
|----------------|-------------|
| `--images-dir` | Directory containing images (jpg, png, webp, etc.). |
| `--user`       | User email or numeric user id to assign items to. |
| `--model`      | `blip` (default) or `vit-gpt2`. |
| `--dry-run`    | Only analyze and print; do not write to the database. |
| `--limit`      | Max number of images to process (0 = no limit). |

### Categories

The script uses the same categories as the app: shirt, trouser, blazer, jacket, shoes, belt, tie, suit, sweater, polo, t_shirt, jeans, shorts, other.
