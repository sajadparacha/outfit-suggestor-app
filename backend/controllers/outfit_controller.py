"""Outfit Controller - Handles outfit-related request orchestration"""
from typing import Optional, List, Dict, Tuple
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
import json
import base64

from models.outfit import OutfitSuggestion
from models.outfit_history import OutfitHistory
from models.user import User
from models.wardrobe import WardrobeItem
from exceptions import GuestLimitReachedException
from services.ai_service import AIService
from services.outfit_service import OutfitService
from services.guest_usage_service import GuestUsageService
from services.wardrobe_matcher import WardrobeMatcher
from utils.image_processor import encode_image, validate_image
from utils.outfit_upload_category import slot_text_has_upload_marker, text_suggests_outerwear


class OutfitController:
    """Controller for outfit suggestion operations"""
    
    def __init__(self, ai_service: AIService, outfit_service: OutfitService):
        """
        Initialize Outfit Controller
        
        Args:
            ai_service: AI service for outfit suggestions
            outfit_service: Outfit service for business logic
        """
        self.ai_service = ai_service
        self.outfit_service = outfit_service
        self.wardrobe_matcher = WardrobeMatcher()
    
    def _prioritize_item_in_matches(
        self,
        matching_items: Dict[str, List[Dict]],
        item: WardrobeItem
    ) -> None:
        """Put the given wardrobe item first in its category if present."""
        category = (item.category or "").lower()
        if category in {"jacket", "jackets", "coat", "coats", "outerwear"}:
            category = "outerwear"
        elif category not in matching_items:
            category = self._normalize_item_category_for_outfit(category)
        if category not in matching_items:
            return
        items_list = matching_items[category]
        idx = next((i for i, m in enumerate(items_list) if m.get("id") == item.id), None)
        if idx is not None and idx > 0:
            items_list.insert(0, items_list.pop(idx))

    def _apply_source_wardrobe_match_overrides(
        self,
        suggestion: OutfitSuggestion,
        matching_items: Dict[str, List[Dict]],
        wardrobe_item: WardrobeItem,
    ) -> None:
        """Pin upload thumbnail and match lists to a known source wardrobe item."""
        self._prioritize_item_in_matches(matching_items, wardrobe_item)
        if self._is_outerwear_wardrobe_category(wardrobe_item.category or ""):
            outerwear_matches = matching_items.setdefault("outerwear", [])
            if not any(match.get("id") == wardrobe_item.id for match in outerwear_matches):
                outerwear_matches.insert(0, self._serialize_wardrobe_item(wardrobe_item))
        normalized_upload = self._normalize_item_category_for_outfit(wardrobe_item.category or "")
        if normalized_upload in {"shirt", "trouser", "blazer", "shoes", "belt", "outerwear"}:
            suggestion.upload_matched_category = normalized_upload
        if normalized_upload == "outerwear":
            suggestion.outerwear_id = wardrobe_item.id
            outerwear_text = (suggestion.outerwear or "").strip()
            if not outerwear_text or outerwear_text.lower() in {"null", "none", "n/a"}:
                label = "coat" if (wardrobe_item.category or "").lower() in {"coat", "coats"} else "jacket"
                parts = [f"Your wardrobe {label}"]
                if wardrobe_item.color:
                    parts.append(f"— {wardrobe_item.color}")
                if wardrobe_item.description:
                    suggestion.outerwear = wardrobe_item.description
                else:
                    suggestion.outerwear = " ".join(parts) + " (uploaded item)"

    def _resolve_upper_body_anchor(self, suggestion: OutfitSuggestion) -> Optional[str]:
        """Return 'outerwear' or 'blazer' when the upload anchors an upper-body layer."""
        for raw in (suggestion.upload_matched_category, suggestion.source_slot):
            normalized = self._normalize_item_category_for_outfit((raw or "").strip())
            if normalized in {"outerwear", "blazer"}:
                return normalized

        upload_slot = self._normalize_item_category_for_outfit(
            (suggestion.upload_matched_category or suggestion.source_slot or "").strip()
        )
        if upload_slot == "shirt" and text_suggests_outerwear(suggestion.shirt):
            return "outerwear"
        if upload_slot == "blazer" and text_suggests_outerwear(suggestion.blazer):
            return "outerwear"
        return None

    def _apply_upper_body_layer_exclusivity(
        self,
        suggestion: OutfitSuggestion,
        matching_items: Optional[Dict[str, List[Dict]]] = None,
    ) -> None:
        """Jacket/coat upload → no blazer or extra sweater; blazer upload → no jacket/sweater."""
        anchor = self._resolve_upper_body_anchor(suggestion)
        if anchor == "outerwear":
            suggestion.blazer_id = None
            suggestion.blazer = ""
            suggestion.sweater = None
            suggestion.sweater_id = None
            self._promote_mislotted_upload_text_to_outerwear(suggestion)
            self._clear_non_anchor_optional_outerwear(suggestion)
            outerwear_text = (suggestion.outerwear or "").strip()
            if not outerwear_text or outerwear_text.lower() in {"null", "none", "n/a"}:
                suggestion.outerwear = "Your wardrobe jacket (uploaded item)"
            if matching_items is not None:
                matching_items.pop("sweater", None)
        elif anchor == "blazer":
            suggestion.outerwear = None
            suggestion.outerwear_id = None
            suggestion.sweater = None
            suggestion.sweater_id = None
            if matching_items is not None:
                matching_items.pop("outerwear", None)
                matching_items.pop("sweater", None)

    def _normalize_item_category_for_outfit(self, category: str) -> str:
        """Map wardrobe category variants to outfit categories."""
        normalized = (category or "").lower()
        if normalized in {"shirts", "polo", "t_shirt", "t-shirt", "tshirt", "tee"}:
            return "shirt"
        if normalized in {"blazers"}:
            return "blazer"
        if normalized in {"jeans", "pants", "pant", "trousers", "shorts"}:
            return "trouser"
        if normalized in {"shoe"}:
            return "shoes"
        if normalized in {"belts"}:
            return "belt"
        if normalized in {"sweater", "sweaters"}:
            return "sweater"
        if normalized in {"tie", "ties"}:
            return "tie"
        if normalized in {"jacket", "jackets", "coat", "coats", "outerwear"}:
            return "outerwear"
        return normalized

    def _is_outerwear_wardrobe_category(self, category: str) -> bool:
        return self._normalize_item_category_for_outfit(category) == "outerwear"

    def _find_serialized_item_in_matches(
        self,
        matching_items: Dict[str, List[Dict]],
        item_id: int,
    ) -> Optional[Dict]:
        for items in matching_items.values():
            for item in items or []:
                if item.get("id") == item_id:
                    return item
        return None

    def _promote_mislotted_upload_text_to_outerwear(self, suggestion: OutfitSuggestion) -> None:
        """Move mis-slotted shirt/blazer copy onto outerwear when it describes a jacket/coat."""
        upload_slot = self._normalize_item_category_for_outfit(
            (suggestion.upload_matched_category or suggestion.source_slot or "").strip()
        )
        if upload_slot not in {"shirt", "blazer"}:
            return

        slot_text = (suggestion.shirt if upload_slot == "shirt" else suggestion.blazer) or ""
        if not text_suggests_outerwear(slot_text):
            return

        suggestion.outerwear = slot_text.strip()
        suggestion.upload_matched_category = "outerwear"
        suggestion.source_slot = "outerwear"
        if upload_slot == "shirt":
            if suggestion.shirt_id is not None:
                suggestion.outerwear_id = suggestion.shirt_id
                suggestion.shirt_id = None
            else:
                suggestion.outerwear_id = None
        elif upload_slot == "blazer":
            if suggestion.blazer_id is not None:
                suggestion.outerwear_id = suggestion.blazer_id
                suggestion.blazer_id = None
            else:
                suggestion.outerwear_id = None

    def _clear_non_anchor_optional_outerwear(self, suggestion: OutfitSuggestion) -> None:
        """Drop a second wardrobe jacket when the upload already anchors outerwear."""
        upload_slot = self._normalize_item_category_for_outfit(
            (suggestion.upload_matched_category or suggestion.source_slot or "").strip()
        )
        if upload_slot == "outerwear":
            anchor_id = suggestion.source_wardrobe_item_id
            if anchor_id is not None:
                suggestion.outerwear_id = anchor_id
            return

        anchor_id = suggestion.source_wardrobe_item_id
        outerwear_text = (suggestion.outerwear or "").strip()

        if slot_text_has_upload_marker(outerwear_text):
            suggestion.outerwear_id = anchor_id
            return

        mis_slot_text = ""
        if upload_slot == "shirt":
            mis_slot_text = (suggestion.shirt or "").strip()
        elif upload_slot == "blazer":
            mis_slot_text = (suggestion.blazer or "").strip()

        if text_suggests_outerwear(mis_slot_text):
            suggestion.outerwear = mis_slot_text
            suggestion.outerwear_id = anchor_id
            return

        if anchor_id is not None:
            if suggestion.outerwear_id != anchor_id:
                suggestion.outerwear_id = anchor_id
            return

        if suggestion.outerwear_id is not None:
            suggestion.outerwear_id = None

        outerwear_text = (suggestion.outerwear or "").strip()
        if (
            outerwear_text
            and not slot_text_has_upload_marker(outerwear_text)
            and not text_suggests_outerwear(mis_slot_text)
        ):
            suggestion.outerwear = None

    def _apply_similar_upload_category_override(
        self,
        suggestion: OutfitSuggestion,
        similar_item: Optional[WardrobeItem],
    ) -> None:
        """When vision mis-slots the upload, trust a close wardrobe image match for category."""
        if not similar_item:
            return
        similar_slot = self._normalize_item_category_for_outfit(similar_item.category or "")
        if similar_slot != "outerwear":
            return
        ai_slot = self._normalize_item_category_for_outfit(
            (suggestion.upload_matched_category or suggestion.source_slot or "").strip()
        )
        if ai_slot not in {"shirt", "blazer"}:
            return

        suggestion.upload_matched_category = "outerwear"
        suggestion.source_slot = "outerwear"
        suggestion.outerwear_id = similar_item.id
        if suggestion.shirt_id == similar_item.id:
            suggestion.shirt_id = None
        if suggestion.blazer_id == similar_item.id:
            suggestion.blazer_id = None
        existing_outerwear = (suggestion.outerwear or "").strip()
        if (
            not existing_outerwear
            or existing_outerwear.lower() in {"null", "none", "n/a"}
            or not slot_text_has_upload_marker(existing_outerwear)
        ):
            description = (similar_item.description or "").strip()
            suggestion.outerwear = description or "Your wardrobe jacket (uploaded item)"

    def _reconcile_outerwear_upload_slot(
        self,
        suggestion: OutfitSuggestion,
        matching_items: Dict[str, List[Dict]],
        similar_item: Optional[WardrobeItem] = None,
    ) -> None:
        """Move upload anchor from shirt/blazer to outerwear when wardrobe evidence says jacket/coat."""
        if similar_item and self._is_outerwear_wardrobe_category(similar_item.category or ""):
            self._apply_similar_upload_category_override(suggestion, similar_item)

        upload_slot = self._normalize_item_category_for_outfit(
            (suggestion.upload_matched_category or suggestion.source_slot or "").strip()
        )
        if upload_slot not in {"shirt", "blazer"}:
            return

        outerwear_text = (suggestion.outerwear or "").strip().lower()
        if any(
            marker in outerwear_text
            for marker in ("uploaded item", "from your upload", "your upload", "uploaded image")
        ):
            suggestion.upload_matched_category = "outerwear"
            suggestion.source_slot = "outerwear"
            return

        mis_slot_text = (suggestion.shirt if upload_slot == "shirt" else suggestion.blazer) or ""
        if text_suggests_outerwear(mis_slot_text):
            self._promote_mislotted_upload_text_to_outerwear(suggestion)
            return

        candidate_ids: List[int] = []
        if suggestion.source_wardrobe_item_id is not None:
            candidate_ids.append(suggestion.source_wardrobe_item_id)
        if upload_slot == "shirt" and suggestion.shirt_id is not None:
            candidate_ids.append(suggestion.shirt_id)
        if upload_slot == "blazer" and suggestion.blazer_id is not None:
            candidate_ids.append(suggestion.blazer_id)
        if suggestion.outerwear_id is not None:
            candidate_ids.append(suggestion.outerwear_id)

        seen: set[int] = set()
        for item_id in candidate_ids:
            if item_id in seen:
                continue
            seen.add(item_id)
            item = self._find_serialized_item_in_matches(matching_items, item_id)
            if not item or not self._is_outerwear_wardrobe_category(item.get("category") or ""):
                continue

            suggestion.upload_matched_category = "outerwear"
            suggestion.source_slot = "outerwear"
            suggestion.outerwear_id = item_id
            if suggestion.shirt_id == item_id:
                suggestion.shirt_id = None
            if suggestion.blazer_id == item_id:
                suggestion.blazer_id = None
            existing_outerwear = (suggestion.outerwear or "").strip()
            if not existing_outerwear or existing_outerwear.lower() in {"null", "none", "n/a"}:
                description = (item.get("description") or "").strip()
                suggestion.outerwear = description or "Your wardrobe jacket (uploaded item)"
            return

    def _wardrobe_item_matches_outfit_slot(self, wardrobe_category: str, outfit_slot: str) -> bool:
        """Match wardrobe category to outfit slot including optional layers."""
        normalized = (wardrobe_category or "").lower()
        if outfit_slot == "outerwear":
            return normalized in {"jacket", "jackets", "coat", "coats", "outerwear"}
        if outfit_slot == "sweater":
            return normalized in {"sweater", "sweaters"}
        if outfit_slot == "tie":
            return normalized in {"tie", "ties"}
        return self._normalize_item_category_for_outfit(wardrobe_category) == outfit_slot

    def _apply_selected_ids_to_matches(
        self,
        suggestion: OutfitSuggestion,
        matching_items: Dict[str, List[Dict]],
        all_wardrobe_items: Optional[List[WardrobeItem]] = None
    ) -> None:
        """Ensure and prioritize AI-selected wardrobe PKs in match lists."""
        selected_by_category = {
            "shirt": suggestion.shirt_id,
            "trouser": suggestion.trouser_id,
            "blazer": suggestion.blazer_id,
            "shoes": suggestion.shoes_id,
            "belt": suggestion.belt_id,
            "sweater": suggestion.sweater_id,
            "outerwear": suggestion.outerwear_id,
            "tie": suggestion.tie_id,
        }

        for category, selected_id in selected_by_category.items():
            if not selected_id or category not in matching_items:
                continue
            items = matching_items[category]
            idx = next((i for i, item in enumerate(items) if item.get("id") == selected_id), None)
            if idx is not None:
                if idx > 0:
                    items.insert(0, items.pop(idx))
                continue

            # If strict matcher didn't include the AI-selected item, inject it by ID.
            if not all_wardrobe_items:
                continue
            selected_item = next((w for w in all_wardrobe_items if w.id == selected_id), None)
            if not selected_item:
                continue

            if not self._wardrobe_item_matches_outfit_slot(selected_item.category or "", category):
                continue

            matching_items[category].insert(0, {
                "id": selected_item.id,
                "category": selected_item.category,
                "color": selected_item.color,
                "description": selected_item.description,
                "image_data": selected_item.image_data
            })

    def _ensure_pinned_selected_items_in_matches(
        self,
        matching_items: Dict[str, List[Dict]],
        selected_items: List[WardrobeItem],
    ) -> None:
        """Ensure multi-select pinned items appear in match lists (outerwear cross-slot)."""
        for item in selected_items:
            self._prioritize_item_in_matches(matching_items, item)
            if self._is_outerwear_wardrobe_category(item.category or ""):
                outerwear_matches = matching_items.setdefault("outerwear", [])
                if not any(match.get("id") == item.id for match in outerwear_matches):
                    outerwear_matches.insert(0, self._serialize_wardrobe_item(item))

    def _serialize_wardrobe_item(self, item: WardrobeItem) -> Dict:
        return {
            "id": item.id,
            "category": item.category,
            "color": item.color,
            "description": item.description,
            "image_data": item.image_data,
        }

    _WARDROBE_COMPLETION_SLOTS = frozenset(
        {"shirt", "trouser", "blazer", "shoes", "belt", "outerwear", "sweater"}
    )
    _UPPER_BODY_COMPLETION_SLOTS = frozenset({"blazer", "outerwear", "sweater"})

    def _group_items_by_outfit_slot(self, items: List[WardrobeItem]) -> Dict[str, List[WardrobeItem]]:
        grouped: Dict[str, List[WardrobeItem]] = {
            "shirt": [],
            "trouser": [],
            "blazer": [],
            "shoes": [],
            "belt": [],
            "outerwear": [],
            "sweater": [],
        }
        for item in items:
            slot = self._normalize_item_category_for_outfit(item.category or "")
            if slot in grouped:
                grouped[slot].append(item)
        return grouped

    def _validate_selected_wardrobe_items(
        self,
        db: Session,
        user_id: int,
        selected_wardrobe_item_ids: Optional[List[int]],
    ) -> Tuple[Dict[str, WardrobeItem], List[WardrobeItem]]:
        ids = selected_wardrobe_item_ids or []
        if not ids:
            return {}, []
        if len(ids) != len(set(ids)):
            raise HTTPException(status_code=400, detail="Select each wardrobe item only once")
        if len(ids) > 5:
            raise HTTPException(status_code=400, detail="Select no more than 5 wardrobe items")

        selected_items = (
            db.query(WardrobeItem)
            .filter(WardrobeItem.user_id == user_id)
            .filter(WardrobeItem.id.in_(ids))
            .all()
        )
        items_by_id = {item.id: item for item in selected_items}
        missing_ids = [item_id for item_id in ids if item_id not in items_by_id]
        if missing_ids:
            raise HTTPException(
                status_code=404,
                detail="Selected wardrobe item not found or doesn't belong to user"
            )

        selected_by_slot: Dict[str, WardrobeItem] = {}
        ordered_items = [items_by_id[item_id] for item_id in ids]
        for item in ordered_items:
            slot = self._normalize_item_category_for_outfit(item.category or "")
            if slot not in self._WARDROBE_COMPLETION_SLOTS:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Selected items must be shirt, trouser, blazer, shoes, belt, "
                        "jacket/coat, or sweater"
                    ),
                )
            if slot in selected_by_slot:
                raise HTTPException(status_code=400, detail="Choose one item per outfit slot")
            if slot in self._UPPER_BODY_COMPLETION_SLOTS:
                for other_slot in self._UPPER_BODY_COMPLETION_SLOTS:
                    if other_slot != slot and other_slot in selected_by_slot:
                        raise HTTPException(
                            status_code=400,
                            detail="Choose only one of blazer, outerwear, or sweater",
                        )
            selected_by_slot[slot] = item
        return selected_by_slot, ordered_items

    def _pinned_slot_display_text(self, item: WardrobeItem) -> str:
        """Human-readable slot copy for user-pinned wardrobe items (no upload markers)."""
        description = (item.description or "").strip()
        if description:
            return description
        color = (item.color or "").strip()
        category = (item.category or "").strip()
        if color and category:
            return f"{color} {category}"
        return category or "Selected wardrobe item"

    def _pin_selected_items_to_suggestion(
        self,
        suggestion: OutfitSuggestion,
        selected_by_slot: Dict[str, WardrobeItem],
        ordered_items: List[WardrobeItem],
    ) -> None:
        if not selected_by_slot:
            return
        slot_id_fields = {
            "shirt": "shirt_id",
            "trouser": "trouser_id",
            "blazer": "blazer_id",
            "shoes": "shoes_id",
            "belt": "belt_id",
            "outerwear": "outerwear_id",
            "sweater": "sweater_id",
        }
        slot_text_fields = {
            "shirt": "shirt",
            "trouser": "trouser",
            "blazer": "blazer",
            "shoes": "shoes",
            "belt": "belt",
            "outerwear": "outerwear",
            "sweater": "sweater",
        }
        for slot, item in selected_by_slot.items():
            setattr(suggestion, slot_id_fields[slot], item.id)
            setattr(suggestion, slot_text_fields[slot], self._pinned_slot_display_text(item))
        # Wardrobe multi-select is not a photo upload — avoid upload-anchor metadata.
        suggestion.upload_matched_category = None
        suggestion.source_slot = None
        if ordered_items and not suggestion.source_wardrobe_item_id:
            suggestion.source_wardrobe_item_id = ordered_items[0].id

    def _build_history_matching_items(
        self,
        db: Session,
        user_id: int,
        entry: object,
    ) -> Dict[str, List[Dict]]:
        matching_items: Dict[str, List[Dict]] = {
            "shirt": [],
            "trouser": [],
            "blazer": [],
            "shoes": [],
            "belt": [],
            "sweater": [],
            "outerwear": [],
            "tie": [],
        }
        selected_ids = {
            "shirt": getattr(entry, "shirt_id", None),
            "trouser": getattr(entry, "trouser_id", None),
            "blazer": getattr(entry, "blazer_id", None),
            "shoes": getattr(entry, "shoes_id", None),
            "belt": getattr(entry, "belt_id", None),
            "sweater": getattr(entry, "sweater_id", None),
            "outerwear": getattr(entry, "outerwear_id", None),
            "tie": getattr(entry, "tie_id", None),
        }
        id_values = [item_id for item_id in selected_ids.values() if item_id]
        if not id_values:
            return matching_items

        items = (
            db.query(WardrobeItem)
            .filter(WardrobeItem.user_id == user_id)
            .filter(WardrobeItem.id.in_(id_values))
            .all()
        )
        items_by_id = {item.id: item for item in items}

        for category, item_id in selected_ids.items():
            if not item_id:
                continue
            wardrobe_item = items_by_id.get(item_id)
            if not wardrobe_item:
                continue
            normalized_item_category = self._normalize_item_category_for_outfit(wardrobe_item.category or "")
            if self._wardrobe_item_matches_outfit_slot(wardrobe_item.category or "", category) or normalized_item_category == category:
                matching_items[category] = [self._serialize_wardrobe_item(wardrobe_item)]

        return matching_items
    
    async def suggest_outfit(
        self,
        image: UploadFile,
        text_input: str,
        location: Optional[str],
        generate_model_image: str,
        image_model: Optional[str] = None,
        use_wardrobe_only: bool = False,
        source_wardrobe_item_id: Optional[int] = None,
        previous_outfit_text: Optional[str] = None,
        occasion: Optional[str] = None,
        season: Optional[str] = None,
        style: Optional[str] = None,
        db: Session = None,
        current_user: Optional[User] = None,
        guest_session_id: Optional[str] = None,
        guest_usage_service: Optional[GuestUsageService] = None,
    ) -> OutfitSuggestion:
        """
        Handle outfit suggestion request
        
        Args:
            image: Uploaded image file
            text_input: Additional context or preferences
            location: User's location (optional)
            generate_model_image: Whether to generate model image (as string)
            db: Database session
            current_user: Current authenticated user (optional)
            
        Returns:
            OutfitSuggestion object
            
        Raises:
            HTTPException: If validation fails or processing error occurs
        """
        try:
            # Validate image
            validate_image(image)

            if current_user is None and guest_session_id and guest_usage_service:
                guest_usage_service.assert_can_use_ai(db, guest_session_id)
            
            # Encode image to base64
            image_base64 = encode_image(image.file)
            
            # Determine wardrobe mode: use_wardrobe_only + authenticated user
            wardrobe_items_dict = None
            wardrobe_only_mode = False
            if use_wardrobe_only and current_user:
                from services.wardrobe_service import WardrobeService
                wardrobe_service = WardrobeService()
                wardrobe_items_dict = wardrobe_service.get_wardrobe_items_by_categories(
                    db=db,
                    user_id=current_user.id,
                    categories=["shirt", "trouser", "blazer", "shoes", "belt", "sweater", "jacket", "tie"]
                )
                # Only enable wardrobe_only if user has at least some items
                has_items = any(items for items in wardrobe_items_dict.values())
                if has_items:
                    wardrobe_only_mode = True
                else:
                    # Empty wardrobe - fall back to free generation
                    wardrobe_items_dict = None
            elif use_wardrobe_only and not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Please log in to use wardrobe-only mode"
                )

            source_wardrobe_item = None
            if source_wardrobe_item_id and current_user:
                from services.wardrobe_service import WardrobeService
                wardrobe_service = WardrobeService()
                source_wardrobe_item = wardrobe_service.get_wardrobe_item(
                    db=db,
                    item_id=source_wardrobe_item_id,
                    user_id=current_user.id,
                )
            
            suggestion, cost_info = self.ai_service.get_outfit_suggestion(
                image_base64, 
                text_input,
                wardrobe_items=wardrobe_items_dict,
                wardrobe_only=wardrobe_only_mode,
                previous_outfit_text=previous_outfit_text,
                source_wardrobe_category=(
                    source_wardrobe_item.category if source_wardrobe_item else None
                ),
                source_wardrobe_item_id=(
                    source_wardrobe_item.id if source_wardrobe_item else None
                ),
            )
            suggestion.source_wardrobe_item_id = source_wardrobe_item_id
            
            # Parse generate_model_image from string to boolean
            should_generate_model_image = generate_model_image.lower() in ('true', '1', 'yes', 'on')
            
            # Generate model image if requested
            if should_generate_model_image:
                # Use provided model or default to DALL-E 3
                model = image_model if image_model in ["dalle3", "stable-diffusion", "nano-banana"] else "dalle3"
                model_image_base64, model_image_cost = await self._generate_model_image(
                    suggestion,
                    image_base64,
                    location,
                    model
                )
                suggestion.model_image = model_image_base64
                cost_info["model_image_cost"] = model_image_cost
                cost_info["total_cost"] = cost_info["gpt4_cost"] + model_image_cost
            
            # Match wardrobe items to outfit suggestion
            if current_user:
                valid_slots = {"shirt", "trouser", "blazer", "shoes", "belt", "outerwear"}
                # Prefer explicit AI-declared source slot only when no known source wardrobe item.
                if not source_wardrobe_item and suggestion.source_slot:
                    normalized_source_slot = self._normalize_item_category_for_outfit(suggestion.source_slot)
                    if normalized_source_slot in valid_slots:
                        suggestion.upload_matched_category = normalized_source_slot

                # Get all wardrobe items
                from services.wardrobe_service import WardrobeService
                wardrobe_service = WardrobeService()
                all_wardrobe_items, _ = wardrobe_service.get_user_wardrobe(
                    db=db,
                    user_id=current_user.id,
                    category=None,
                    search=None,
                    limit=None,
                    offset=None
                )
                
                # Find matching items
                matching_items = self.wardrobe_matcher.match_wardrobe_to_outfit(
                    suggestion,
                    all_wardrobe_items
                )
                self._apply_selected_ids_to_matches(suggestion, matching_items, all_wardrobe_items)

                similar_item = None
                if source_wardrobe_item:
                    self._apply_source_wardrobe_match_overrides(
                        suggestion, matching_items, source_wardrobe_item
                    )
                else:
                    # Find which wardrobe item the uploaded image looks most like.
                    # Keep the threshold conservative to avoid mislabeling uploads
                    # (e.g., shirt being pinned into shoes section).
                    similar_item = wardrobe_service.find_most_similar_wardrobe_item(
                        image_base64,
                        all_wardrobe_items,
                        max_distance=12
                    )
                    if similar_item:
                        self._prioritize_item_in_matches(matching_items, similar_item)
                        # Use similarity-derived category only as fallback when AI did not
                        # explicitly specify which slot corresponds to the uploaded item.
                        if not suggestion.upload_matched_category:
                            normalized_category = self._normalize_item_category_for_outfit(similar_item.category or "")
                            if normalized_category in valid_slots:
                                suggestion.upload_matched_category = normalized_category
                    else:
                        wardrobe_service.reorder_matches_by_upload_similarity(
                            matching_items,
                            image_base64
                        )

                self._reconcile_outerwear_upload_slot(suggestion, matching_items, similar_item)
                self._apply_upper_body_layer_exclusivity(suggestion, matching_items)
                
                # Add matching items to suggestion (Pydantic will handle serialization)
                suggestion.matching_wardrobe_items = matching_items
            
            # Save to database using outfit service
            self.outfit_service.save_outfit_history(
                db=db,
                user_id=current_user.id if current_user else None,
                text_input=text_input,
                image_data=image_base64,
                model_image=suggestion.model_image,
                suggestion=suggestion,
                occasion=occasion,
                season=season,
                style=style,
            )
            
            # Ensure cost_info has model_image_cost set
            if "model_image_cost" not in cost_info:
                cost_info["model_image_cost"] = 0.0
            if "total_cost" not in cost_info or cost_info["total_cost"] == cost_info.get("gpt4_cost", 0):
                cost_info["total_cost"] = cost_info.get("gpt4_cost", 0) + cost_info.get("model_image_cost", 0)

            if current_user is None and guest_session_id and guest_usage_service:
                guest_usage_service.record_successful_ai_call(db, guest_session_id)
            
            # Add cost information to suggestion
            if hasattr(suggestion, 'model_dump'):
                suggestion_dict = suggestion.model_dump()
                suggestion_dict["cost"] = cost_info
                return OutfitSuggestion(**suggestion_dict)
            else:
                # For Pydantic v1 compatibility
                suggestion.cost = cost_info
                return suggestion
            
        except HTTPException:
            raise
        except GuestLimitReachedException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )

    async def suggest_outfit_from_wardrobe_only(
        self,
        text_input: str,
        occasion: str,
        season: str,
        style: str,
        db: Session,
        current_user: Optional[User],
        selected_wardrobe_item_ids: Optional[List[int]] = None,
        previous_outfit_text: Optional[str] = None,
        avoid_outfit_texts: Optional[List[str]] = None,
    ) -> OutfitSuggestion:
        """
        Suggest an outfit using ONLY the user's wardrobe items (no uploaded image).
        
        Args:
            text_input: Extra free-text preferences from user
            occasion: Occasion (casual, business, formal, etc.)
            season: Season (all, spring, summer, fall, winter)
            style: Style preference (modern, classic, etc.)
            db: Database session
            current_user: Current authenticated user (required)
        
        Returns:
            OutfitSuggestion object
        """
        from services.wardrobe_service import WardrobeService

        try:
            if not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required to use wardrobe-only suggestions"
                )

            wardrobe_service = WardrobeService()

            selected_by_slot, ordered_selected_items = self._validate_selected_wardrobe_items(
                db=db,
                user_id=current_user.id,
                selected_wardrobe_item_ids=selected_wardrobe_item_ids,
            )
            all_wardrobe_items, _ = wardrobe_service.get_user_wardrobe(
                db=db,
                user_id=current_user.id,
                category=None,
                search=None,
                limit=None,
                offset=None
            )
            wardrobe_items_dict = self._group_items_by_outfit_slot(all_wardrobe_items)

            # Build combined context for the AI prompt
            filters_context = f"Occasion: {occasion}, Season: {season}, Style: {style}"
            combined_text_input = filters_context
            if selected_by_slot:
                selected_lines = []
                missing_slots = [
                    slot
                    for slot in [
                        "shirt",
                        "trouser",
                        "blazer",
                        "shoes",
                        "belt",
                        "outerwear",
                        "sweater",
                    ]
                    if slot not in selected_by_slot
                ]
                if any(
                    slot in selected_by_slot for slot in self._UPPER_BODY_COMPLETION_SLOTS
                ):
                    missing_slots = [
                        slot
                        for slot in missing_slots
                        if slot not in self._UPPER_BODY_COMPLETION_SLOTS
                    ]
                for slot, item in selected_by_slot.items():
                    selected_lines.append(
                        f"{slot}: ID {item.id}, {item.color or 'unknown color'}, {item.description or item.category}"
                    )
                combined_text_input += (
                    ". REQUIRED SELECTED WARDROBE ITEMS: Keep these exact selected items in their slots: "
                    + "; ".join(selected_lines)
                    + ". Generate the remaining outfit slots: "
                    + ", ".join(missing_slots)
                    + ". Return each selected item's exact ID in the matching JSON ID field."
                )
            extra = text_input.strip()
            if extra:
                combined_text_input += f". Additional preferences: {extra}"

            # Call AI service in text-only, wardrobe-only mode
            suggestion, cost_info = self.ai_service.get_outfit_suggestion_text_only(
                text_input=combined_text_input,
                wardrobe_items=wardrobe_items_dict,
                wardrobe_only=True,
                previous_outfit_text=previous_outfit_text,
                avoid_outfit_texts=avoid_outfit_texts,
            )
            self._pin_selected_items_to_suggestion(
                suggestion,
                selected_by_slot,
                ordered_selected_items,
            )

            # Match wardrobe items to outfit suggestion (for UI purposes)
            matching_items = self.wardrobe_matcher.match_wardrobe_to_outfit(
                suggestion,
                all_wardrobe_items
            )
            self._apply_selected_ids_to_matches(suggestion, matching_items, all_wardrobe_items)
            self._ensure_pinned_selected_items_in_matches(matching_items, ordered_selected_items)
            suggestion.matching_wardrobe_items = matching_items

            # Save to history (no image_data/model_image)
            self.outfit_service.save_outfit_history(
                db=db,
                user_id=current_user.id,
                text_input=combined_text_input,
                image_data=None,
                model_image=None,
                suggestion=suggestion,
                occasion=occasion,
                season=season,
                style=style,
            )

            # Ensure cost info fields
            if "model_image_cost" not in cost_info:
                cost_info["model_image_cost"] = 0.0
            if "total_cost" not in cost_info or cost_info["total_cost"] == cost_info.get("gpt4_cost", 0):
                cost_info["total_cost"] = cost_info.get("gpt4_cost", 0) + cost_info.get("model_image_cost", 0)

            # Attach cost to suggestion
            if hasattr(suggestion, 'model_dump'):
                suggestion_dict = suggestion.model_dump()
                suggestion_dict["cost"] = cost_info
                return OutfitSuggestion(**suggestion_dict)
            else:
                suggestion.cost = cost_info
                return suggestion

        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )
    
    async def _generate_model_image(
        self,
        suggestion: OutfitSuggestion,
        uploaded_image_base64: str,
        location: Optional[str],
        model: str = "dalle3"
    ) -> Tuple[Optional[str], float]:
        """
        Generate model image using AI service
        
        Args:
            suggestion: Outfit suggestion
            uploaded_image_base64: Base64 encoded uploaded image
            location: User's location
            
        Returns:
            Base64 encoded model image or None if generation fails
        """
        try:
            # Parse location details if provided as JSON string
            location_details = None
            location_string = None
            
            if location:
                try:
                    if location.strip().startswith('{'):
                        location_details = json.loads(location)
                    else:
                        location_string = location
                except:
                    location_string = location
            
            result, cost = self.ai_service.generate_model_image(
                suggestion,
                uploaded_image_base64=uploaded_image_base64,
                location=location_string if location_string else None,
                location_details=location_details if location_details else None,
                model=model
            )
            return result, cost
        except HTTPException as http_err:
            # If alternative model fails, try DALL-E 3 as fallback
            if model in ["stable-diffusion", "nano-banana"]:
                print(f"⚠️ {model} failed: {http_err.detail}")
                print("🔄 Falling back to DALL-E 3...")
                try:
                    result, cost = self.ai_service.generate_model_image(
                        suggestion,
                        uploaded_image_base64=uploaded_image_base64,
                        location=location_string if location_string else None,
                        location_details=location_details if location_details else None,
                        model="dalle3"
                    )
                    return result, cost
                except Exception as fallback_err:
                    print(f"❌ DALL-E 3 fallback also failed: {str(fallback_err)}")
                    return None
            else:
                # DALL-E 3 failed, just return None
                print(f"❌ ERROR: Failed to generate model image with {model}: {str(http_err)}")
                return None
        except Exception as e:
            # Log error but don't fail the request
            print(f"❌ ERROR: Failed to generate model image: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    async def check_duplicate(
        self,
        image: UploadFile,
        db: Session,
        current_user: Optional[User]
    ) -> Dict:
        """
        Check if an uploaded image already exists in history
        
        Args:
            image: Uploaded image file
            db: Database session
            current_user: Current authenticated user (optional)
            
        Returns:
            Dict with duplicate status and matching entry if found
        """
        try:
            # Validate and encode image
            validate_image(image)
            image_base64 = encode_image(image.file)
            
            # For anonymous users, don't check duplicates
            if not current_user:
                return {"is_duplicate": False}
            
            # Use outfit service to check for duplicates
            duplicate_result = self.outfit_service.check_duplicate_image(
                db=db,
                user_id=current_user.id,
                image_base64=image_base64
            )
            
            if duplicate_result:
                entry = duplicate_result
                return {
                    "is_duplicate": True,
                    "existing_suggestion": {
                        "id": entry.id,
                        "created_at": entry.created_at.isoformat(),
                        "text_input": entry.text_input,
                        "model_image": entry.model_image,
                        "shirt": entry.shirt,
                        "trouser": entry.trouser,
                        "blazer": entry.blazer,
                        "shoes": entry.shoes,
                        "belt": entry.belt,
                        "reasoning": entry.reasoning
                    }
                }
            
            return {"is_duplicate": False}
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error checking duplicate: {str(e)}"
            )
    
    async def get_outfit_history(
        self,
        limit: int,
        db: Session,
        current_user: Optional[User]
    ) -> List[Dict]:
        """
        Get outfit suggestion history
        
        Args:
            limit: Maximum number of history entries to return
            db: Database session
            current_user: Current authenticated user (optional)
            
        Returns:
            List of outfit history entries
        """
        try:
            # Must be authenticated to see history
            if not current_user:
                return []
            
            # Use outfit service to get history
            history = self.outfit_service.get_user_history(
                db=db,
                user_id=current_user.id,
                limit=limit
            )
            
            # Format response
            result = []
            for entry in history:
                created_at = getattr(entry, "created_at", None)
                if hasattr(created_at, "isoformat"):
                    created_at_str = created_at.isoformat()
                elif created_at is not None:
                    created_at_str = str(created_at)
                else:
                    created_at_str = ""
                matching_items = self._build_history_matching_items(
                    db=db,
                    user_id=current_user.id,
                    entry=entry,
                )
                result.append({
                    "id": entry.id,
                    "created_at": created_at_str,
                    "text_input": entry.text_input,
                    "image_data": entry.image_data,
                    "model_image": getattr(entry, 'model_image', None),
                    "shirt": entry.shirt,
                    "trouser": entry.trouser,
                    "blazer": entry.blazer,
                    "shoes": entry.shoes,
                    "belt": entry.belt,
                    "reasoning": entry.reasoning,
                    "sweater": getattr(entry, "sweater", None),
                    "outerwear": getattr(entry, "outerwear", None),
                    "tie": getattr(entry, "tie", None),
                    "shirt_id": getattr(entry, "shirt_id", None),
                    "trouser_id": getattr(entry, "trouser_id", None),
                    "blazer_id": getattr(entry, "blazer_id", None),
                    "shoes_id": getattr(entry, "shoes_id", None),
                    "belt_id": getattr(entry, "belt_id", None),
                    "sweater_id": getattr(entry, "sweater_id", None),
                    "outerwear_id": getattr(entry, "outerwear_id", None),
                    "tie_id": getattr(entry, "tie_id", None),
                    "source_wardrobe_item_id": getattr(entry, "source_wardrobe_item_id", None),
                    "matching_wardrobe_items": matching_items,
                })
            
            return result
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching history: {str(e)}"
            )
    
    async def delete_outfit_history(
        self,
        entry_id: int,
        db: Session,
        current_user: Optional[User]
    ) -> dict:
        """
        Delete an outfit history entry
        
        Args:
            entry_id: History entry ID to delete
            db: Database session
            current_user: Current authenticated user (required)
            
        Returns:
            Dict with success message
            
        Raises:
            HTTPException: If not authenticated or entry not found
        """
        try:
            # Must be authenticated to delete history
            if not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required to delete history"
                )
            
            # Use outfit service to delete entry
            deleted = self.outfit_service.delete_history_entry(
                db=db,
                entry_id=entry_id,
                user_id=current_user.id
            )
            
            if not deleted:
                raise HTTPException(
                    status_code=404,
                    detail="History entry not found or doesn't belong to user"
                )
            
            return {"message": "History entry deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting history entry: {str(e)}"
            )
    
    async def suggest_outfit_from_wardrobe_item(
        self,
        wardrobe_item_id: int,
        text_input: str,
        location: Optional[str],
        generate_model_image: str,
        image_model: Optional[str] = None,
        use_wardrobe_only: bool = False,
        source_wardrobe_item_id: Optional[int] = None,
        occasion: Optional[str] = None,
        season: Optional[str] = None,
        style: Optional[str] = None,
        db: Session = None,
        current_user: Optional[User] = None
    ) -> OutfitSuggestion:
        """
        Handle outfit suggestion request using a wardrobe item's image
        
        Args:
            wardrobe_item_id: ID of the wardrobe item to use
            text_input: Additional context or preferences
            location: User's location (optional)
            generate_model_image: Whether to generate model image (as string)
            image_model: Image generation model (optional)
            db: Database session
            current_user: Current authenticated user (required)
            
        Returns:
            OutfitSuggestion object
            
        Raises:
            HTTPException: If validation fails or processing error occurs
        """
        try:
            # Require authentication
            if not current_user:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication required to use wardrobe items"
                )
            
            # Get wardrobe item
            from services.wardrobe_service import WardrobeService
            wardrobe_service = WardrobeService()
            wardrobe_item = wardrobe_service.get_wardrobe_item(
                db=db,
                item_id=wardrobe_item_id,
                user_id=current_user.id
            )
            
            if not wardrobe_item:
                raise HTTPException(
                    status_code=404,
                    detail=f"Wardrobe item not found or doesn't belong to user"
                )
            
            # Check if item has an image
            if not wardrobe_item.image_data:
                raise HTTPException(
                    status_code=400,
                    detail="Wardrobe item doesn't have an image. Please upload an image for this item first."
                )
            
            # Use wardrobe item's image for outfit suggestion
            image_base64 = wardrobe_item.image_data
            
            wardrobe_items_dict = None
            wardrobe_only_mode = False
            if use_wardrobe_only:
                all_wardrobe_items, _ = wardrobe_service.get_user_wardrobe(
                    db=db,
                    user_id=current_user.id,
                    category=None,
                    search=None,
                    limit=None,
                    offset=None
                )
                if all_wardrobe_items:
                    wardrobe_items_dict = wardrobe_service.get_wardrobe_items_by_categories(
                        db=db,
                        user_id=current_user.id,
                        categories=["shirt", "trouser", "blazer", "shoes", "belt", "sweater", "jacket", "tie"]
                    )
                    wardrobe_only_mode = True
            
            suggestion, cost_info = self.ai_service.get_outfit_suggestion(
                image_base64,
                text_input,
                wardrobe_items=wardrobe_items_dict,
                wardrobe_only=wardrobe_only_mode,
                source_wardrobe_category=wardrobe_item.category,
                source_wardrobe_item_id=wardrobe_item.id,
            )
            suggestion.source_wardrobe_item_id = source_wardrobe_item_id or wardrobe_item_id
            
            # Parse generate_model_image from string to boolean
            should_generate_model_image = generate_model_image.lower() in ('true', '1', 'yes', 'on')
            
            # Generate model image if requested
            if should_generate_model_image:
                model = image_model if image_model in ["dalle3", "stable-diffusion", "nano-banana"] else "dalle3"
                model_image_base64, model_image_cost = await self._generate_model_image(
                    suggestion,
                    image_base64,
                    location,
                    model
                )
                suggestion.model_image = model_image_base64
                cost_info["model_image_cost"] = model_image_cost
                cost_info["total_cost"] = cost_info["gpt4_cost"] + model_image_cost
            
            # Match wardrobe items to outfit suggestion
            all_wardrobe_items, _ = wardrobe_service.get_user_wardrobe(
                db=db,
                user_id=current_user.id,
                category=None,
                search=None,
                limit=None,
                offset=None
            )
            
            matching_items = self.wardrobe_matcher.match_wardrobe_to_outfit(
                suggestion,
                all_wardrobe_items
            )
            self._apply_selected_ids_to_matches(suggestion, matching_items, all_wardrobe_items)
            self._apply_source_wardrobe_match_overrides(suggestion, matching_items, wardrobe_item)
            self._reconcile_outerwear_upload_slot(suggestion, matching_items)
            self._apply_upper_body_layer_exclusivity(suggestion, matching_items)
            suggestion.matching_wardrobe_items = matching_items
            
            # Save to database using outfit service
            self.outfit_service.save_outfit_history(
                db=db,
                user_id=current_user.id,
                text_input=text_input,
                image_data=image_base64,
                model_image=suggestion.model_image,
                suggestion=suggestion,
                occasion=occasion,
                season=season,
                style=style,
            )
            
            # Ensure cost_info has model_image_cost set
            if "model_image_cost" not in cost_info:
                cost_info["model_image_cost"] = 0.0
            if "total_cost" not in cost_info or cost_info["total_cost"] == cost_info.get("gpt4_cost", 0):
                cost_info["total_cost"] = cost_info.get("gpt4_cost", 0) + cost_info.get("model_image_cost", 0)
            
            # Add cost information to suggestion
            if hasattr(suggestion, 'model_dump'):
                suggestion_dict = suggestion.model_dump()
                suggestion_dict["cost"] = cost_info
                return OutfitSuggestion(**suggestion_dict)
            else:
                # For Pydantic v1 compatibility
                suggestion.cost = cost_info
                return suggestion
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error: {str(e)}"
            )





