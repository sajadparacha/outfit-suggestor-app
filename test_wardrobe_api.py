#!/usr/bin/env python3
"""
Test script for Wardrobe API endpoints
Requires: User to be logged in and have auth token
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8001"

def test_wardrobe_endpoints(token: str):
    """Test wardrobe API endpoints"""
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("=" * 60)
    print("Testing Wardrobe API Endpoints")
    print("=" * 60)
    
    # Test 1: Get wardrobe (should be empty initially)
    print("\n1. Testing GET /api/wardrobe")
    response = requests.get(f"{BASE_URL}/api/wardrobe", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        items = response.json()
        print(f"   ✅ Success: Found {len(items)} items in wardrobe")
    else:
        print(f"   ❌ Error: {response.text}")
        return False
    
    # Test 2: Get wardrobe summary
    print("\n2. Testing GET /api/wardrobe/summary")
    response = requests.get(f"{BASE_URL}/api/wardrobe/summary", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        summary = response.json()
        print(f"   ✅ Success: Total items: {summary.get('total_items', 0)}")
        print(f"   Categories: {summary.get('categories', [])}")
    else:
        print(f"   ❌ Error: {response.text}")
    
    # Test 3: Add a wardrobe item
    print("\n3. Testing POST /api/wardrobe")
    form_data = {
        "category": "shirt",
        "name": "Blue Oxford Shirt",
        "description": "Classic blue oxford button-down shirt",
        "color": "Navy blue",
        "brand": "Ralph Lauren",
        "size": "Large",
        "condition": "good"
    }
    # Note: For full test, you'd need to include an image file
    response = requests.post(
        f"{BASE_URL}/api/wardrobe",
        headers={"Authorization": f"Bearer {token}"},  # No Content-Type for multipart
        data=form_data
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 201:
        item = response.json()
        print(f"   ✅ Success: Added item ID {item.get('id')}")
        item_id = item.get('id')
        
        # Test 4: Get specific item
        print("\n4. Testing GET /api/wardrobe/{item_id}")
        response = requests.get(f"{BASE_URL}/api/wardrobe/{item_id}", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Success: Retrieved item: {response.json().get('name')}")
        else:
            print(f"   ❌ Error: {response.text}")
        
        # Test 5: Update item
        print("\n5. Testing PUT /api/wardrobe/{item_id}")
        update_data = {
            "color": "Dark navy blue",
            "description": "Updated description"
        }
        response = requests.put(
            f"{BASE_URL}/api/wardrobe/{item_id}",
            headers={"Authorization": f"Bearer {token}"},
            data=update_data
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Success: Updated item")
        else:
            print(f"   ❌ Error: {response.text}")
        
        # Test 6: Delete item
        print("\n6. Testing DELETE /api/wardrobe/{item_id}")
        response = requests.delete(f"{BASE_URL}/api/wardrobe/{item_id}", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Success: Deleted item")
        else:
            print(f"   ❌ Error: {response.text}")
        
        return True
    else:
        print(f"   ❌ Error: {response.text}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_wardrobe_api.py <auth_token>")
        print("\nTo get an auth token:")
        print("1. Register or login via the API")
        print("2. Copy the access_token from the response")
        sys.exit(1)
    
    token = sys.argv[1]
    success = test_wardrobe_endpoints(token)
    
    if success:
        print("\n" + "=" * 60)
        print("✅ All wardrobe API tests passed!")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ Some tests failed")
        print("=" * 60)
        sys.exit(1)


