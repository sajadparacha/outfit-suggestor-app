# How to Unpublish/Take Down the App

## Frontend (GitHub Pages)

### Option 1: Delete gh-pages Branch (Complete Removal)
```bash
cd /Users/sajad/outfit-suggestor-app
git push origin --delete gh-pages
```

This will completely remove the GitHub Pages deployment.

### Option 2: Disable GitHub Pages (Keep Branch)
1. Go to: https://github.com/sajadparacha/outfit-suggestor-app/settings/pages
2. Under "Source", select "None"
3. Click "Save"

The site will be taken down but the gh-pages branch remains.

---

## Backend (Railway)

### Option 1: Delete the Project (Complete Removal)
1. Go to https://railway.app
2. Open your project
3. Click "Settings" tab
4. Scroll to bottom
5. Click "Delete Project"
6. Confirm deletion

This removes the backend and database completely.

### Option 2: Pause Services (Keep Project)
1. Go to your Railway project
2. Click on backend service
3. Click "Settings" tab
4. Find "Service Settings"
5. Click "Remove Service" or pause it

The backend will stop but the project remains for future use.

---

## Quick Commands

### Take Down Frontend Only
```bash
git push origin --delete gh-pages
```

### Take Down Everything
1. Delete gh-pages branch (command above)
2. Delete Railway project (via Railway dashboard)

---

## Restore Later

If you want to republish:
1. Frontend: `cd frontend && npm run deploy`
2. Backend: Recreate Railway project from GitHub repo








