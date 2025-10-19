#!/bin/bash
# Complete deployment script for Outfit Suggestor App
# Run this after creating your GitHub repository

echo "🚀 Starting Outfit Suggestor App Deployment..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Get GitHub username
echo "📝 Please enter your GitHub username:"
read GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username is required"
    exit 1
fi

echo "🔗 Adding GitHub remote..."
git remote add origin https://github.com/$GITHUB_USERNAME/outfit-suggestor-app.git

echo "📤 Pushing code to GitHub..."
git push -u origin main

echo "🏠 Updating homepage URL..."
sed -i '' "s/REPLACE_WITH_YOUR_USERNAME/$GITHUB_USERNAME/g" frontend/package.json

echo "💾 Committing homepage change..."
git add frontend/package.json
git commit -m "Update homepage URL for GitHub Pages"
git push origin main

echo "✅ Frontend deployment setup complete!"
echo ""
echo "🌐 Your app will be available at: https://$GITHUB_USERNAME.github.io/outfit-suggestor-app"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://railway.app and sign up with GitHub"
echo "2. Create new project from your GitHub repo"
echo "3. Add environment variable: OPENAI_API_KEY=your_key"
echo "4. Enable GitHub Pages in your repo settings"
echo ""
echo "🎉 Deployment complete!"
