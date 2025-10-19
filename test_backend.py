#!/usr/bin/env python3
"""
Simple test script to verify the backend API is working
"""

import requests
import json

def test_backend():
    """Test the backend API endpoints"""
    
    # Test health check
    try:
        response = requests.get("http://localhost:8001/")
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running. Please start it first.")
        return False
    
    print("✅ Backend server is running!")
    return True

if __name__ == "__main__":
    test_backend()
