# Commands to run after creating GitHub repository:

# 1. Add remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/outfit-suggestor-app.git

# 2. Push to GitHub
git push -u origin main

# 3. Update homepage URL in package.json (replace YOUR_USERNAME)
sed -i '' 's/yourusername/YOUR_USERNAME/g' frontend/package.json

# 4. Commit the homepage change
git add frontend/package.json
git commit -m "Update homepage URL for GitHub Pages"
git push origin main
