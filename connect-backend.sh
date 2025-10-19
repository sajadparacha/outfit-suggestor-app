#!/bin/bash
# Script to connect frontend to backend after Railway deployment

echo "🔗 Connecting frontend to backend..."

echo "📝 Please enter your Railway backend URL (e.g., https://outfit-suggestor-app-production.railway.app):"
read RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Railway URL is required"
    exit 1
fi

echo "📝 Creating production environment file..."
echo "REACT_APP_API_URL=$RAILWAY_URL" > frontend/.env.production

echo "💾 Committing and pushing changes..."
git add frontend/.env.production
git commit -m "Add production API URL"
git push origin main

echo "✅ Frontend connected to backend!"
echo "🌐 Your app is now live at: https://sajadparacha.github.io/outfit-suggestor-app"
echo "🔧 Backend API: $RAILWAY_URL"
