import httpx


def test_wardrobe_summary(client: httpx.Client, auth_headers: dict):
    resp = client.get("/api/wardrobe/summary", headers=auth_headers)
    resp.raise_for_status()
    data = resp.json()
    assert "total_items" in data
    assert "by_category" in data


def test_wardrobe_add_get_update_delete(
    client: httpx.Client,
    auth_headers: dict,
    sample_image_upload,
):
    # Add item (with image upload)
    files = {"image": sample_image_upload}
    form = {"category": "shirt", "color": "Blue", "description": "Remote test shirt"}
    create = client.post("/api/wardrobe", headers=auth_headers, files=files, data=form)
    create.raise_for_status()
    created = create.json()
    item_id = created["id"]

    try:
        # Get item
        got = client.get(f"/api/wardrobe/{item_id}", headers=auth_headers)
        got.raise_for_status()
        got_data = got.json()
        assert got_data["id"] == item_id

        # Update item
        update = client.put(
            f"/api/wardrobe/{item_id}",
            headers=auth_headers,
            data={"color": "Navy", "description": "Updated remote test shirt"},
        )
        update.raise_for_status()
        upd = update.json()
        assert upd["id"] == item_id

    finally:
        # Cleanup: delete item
        client.delete(f"/api/wardrobe/{item_id}", headers=auth_headers)


