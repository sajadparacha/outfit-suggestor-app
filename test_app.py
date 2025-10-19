#!/usr/bin/env python3
"""
Comprehensive test script for the Outfit Suggestor App
"""

import subprocess
import time
import requests
import sys
import os

def test_backend_startup():
    """Test if backend can start without errors"""
    print("Testing backend startup...")
    try:
        # Start backend in background
        process = subprocess.Popen([
            'python', 'main.py'
        ], cwd='/Users/sajad/outfit-suggestor-app/backend', 
           stdout=subprocess.PIPE, 
           stderr=subprocess.PIPE)
        
        # Wait a bit for startup
        time.sleep(5)
        
        # Test if it's responding
        try:
            response = requests.get('http://localhost:8001/', timeout=5)
            if response.status_code == 200:
                print("✅ Backend started successfully")
                return True, process
            else:
                print(f"❌ Backend returned status {response.status_code}")
                return False, process
        except requests.exceptions.RequestException as e:
            print(f"❌ Backend not responding: {e}")
            return False, process
            
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return False, None

def test_frontend_build():
    """Test if frontend builds without errors"""
    print("Testing frontend build...")
    try:
        result = subprocess.run([
            'npm', 'run', 'build'
        ], cwd='/Users/sajad/outfit-suggestor-app/frontend',
           capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Frontend builds successfully")
            return True
        else:
            print(f"❌ Frontend build failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error building frontend: {e}")
        return False

def main():
    print("🧪 Testing Outfit Suggestor App...")
    print("=" * 50)
    
    # Test frontend build
    frontend_ok = test_frontend_build()
    
    # Test backend startup
    backend_ok, backend_process = test_backend_startup()
    
    # Cleanup
    if backend_process:
        backend_process.terminate()
        backend_process.wait()
    
    print("=" * 50)
    if frontend_ok and backend_ok:
        print("🎉 All tests passed! App is ready to run.")
        print("\nTo start the app:")
        print("cd /Users/sajad/outfit-suggestor-app")
        print("./start.sh")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
