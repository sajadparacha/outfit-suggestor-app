# AI Outfit Suggestor – User Guide

This guide explains how to use the AI Outfit Suggestor app as an end user: getting suggestions, managing your wardrobe, viewing history, using random picks, and tips for mobile.

---

## Getting Started

1. **Open the app**  
   - Web: [https://sajadparacha.github.io/outfit-suggestor-app](https://sajadparacha.github.io/outfit-suggestor-app)  
   - Or run locally: `http://localhost:3000` (after starting the app).

2. **Optional: create an account**  
   - Click **Sign Up** (top right), enter email and password, then activate via the link in your email (if enabled).  
   - With an account you can: save outfit history, manage a wardrobe, use Random from Wardrobe and Random from History, and change password in Settings.

3. **You can use the app without logging in**  
   - You can still upload a photo and get one-off outfit suggestions; they just won’t be saved to history or use your wardrobe.

---

## Getting an Outfit Suggestion

1. Go to **Get Suggestion** (main tab).
2. **Upload a photo** of a clothing item (or a partial outfit):
   - Drag and drop onto the upload area, or click to choose a file.
   - Supported: JPG, PNG, WebP, up to 10 MB.
   - You can upload a single item (e.g. a shirt) or a combination (e.g. shirt + trousers); the AI will suggest the rest.
3. **Optional**: Add text (e.g. “business casual”, “weekend brunch”) in the preference field.
4. **Optional**: If you’re logged in, turn on **Use wardrobe only** in the sidebar to get suggestions only from items in your wardrobe.
5. Click **Get AI Suggestion**.
6. Wait for the result. You’ll see:
   - Recommended pieces (shirt, trousers, blazer, shoes, belt) and short reasoning.
   - Optional AI-generated model image (if you enabled “Generate model image” and the feature is available).
7. Use **Next** to get another suggestion, or **Like** / **Dislike** for feedback. If you’re logged in, you can **Add to Wardrobe** the uploaded item from this screen.

---

## Wardrobe

Available when you’re **logged in**.

- Open the **Wardrobe** tab to see all your saved items.
- **Add items**: On the main screen, upload a photo and click **Add to Wardrobe** (or use the sidebar “Add to Wardrobe” after uploading). The AI can suggest category, color, and description; you can edit before saving. Duplicate detection helps avoid adding the same item twice.
- **Edit or delete**: Open an item to update category, color, description, or image, or to delete it.
- **Get a suggestion from one item**: Open a wardrobe item and use **Get AI Suggestion** to get an outfit built around that piece.
- **Filter**: Use category filters (e.g. Shirts, Trousers) to narrow the list.

---

## Outfit History

Available when you’re **logged in**.

- Open the **History** tab to see past outfit suggestions.
- Each entry shows the recommendation and, if available, the uploaded photo and/or AI model image.
- **Search**: Use the search box to find entries by clothing, colors, or context.
- **View**: Click an entry (or image) to see full details and full-screen images.
- **Delete**: Remove individual entries you no longer need.
- **Load into main view**: Open a history entry and use the option to load it back into the main suggestion view.

---

## Random Picks (logged in only)

In the **sidebar** (under “Random picks”, when logged in):

- **Random from Wardrobe**  
  Builds one outfit by randomly choosing items from your wardrobe (one per category). No photo upload; use it for quick ideas from what you own.

- **Random from History**  
  Picks a random past suggestion and shows it on the main screen. Handy for rediscovering old ideas.

If you use Random from History and have no history yet, the app will tell you to get some suggestions first.

---

## Settings

Available when you’re **logged in** (Settings tab).

- **Change password**: Enter current password and new password.
- **Account info**: View the email for your account (managed via Settings / profile as implemented in the app).

---

## About

The **About** tab shows:

- Short description of the app and developer.
- Key features (wardrobe, suggestions, AI models, history, random picks, mobile-friendly, etc.).
- Links (e.g. LinkedIn, GitHub, Instagram) and tech stack.

---

## Using the App on Mobile

The app is **mobile-friendly**:

- **Navigation**: On small screens, the top tabs (Get Suggestion, History, Wardrobe, etc.) scroll horizontally. Swipe or scroll to reach all sections.
- **Touch**: Buttons and tabs are sized for touch (at least 48px). Use taps instead of hover.
- **Layout**: Content stacks in one column on phones; sidebar and main area use responsive padding.
- **Upload**: You can upload from your camera roll or take a photo if your device supports it (camera option appears when available).

For the best experience, use a modern browser (e.g. Chrome, Safari, Firefox) and allow camera/photo access if you want to take photos from the app.

---

## Quick Reference

| Goal                     | Where / How                                           |
|--------------------------|--------------------------------------------------------|
| Get outfit from a photo  | Get Suggestion → upload photo → Get AI Suggestion     |
| Use only my wardrobe     | Get Suggestion → turn on “Use wardrobe only”          |
| Add item to wardrobe     | Upload photo → Add to Wardrobe (or from main result)   |
| Random outfit from wardrobe | Sidebar → Random picks → Random from Wardrobe      |
| Random past suggestion   | Sidebar → Random picks → Random from History           |
| Search past suggestions  | History tab → search box                               |
| Change password          | Settings tab → Change password                         |

---

## Need Help?

- **Errors on upload**: Use images under 10 MB in JPG, PNG, or WebP.
- **No suggestion**: Check your internet connection and try again; the AI service may be temporarily busy.
- **Account / login**: Ensure you’ve activated your account via the email link (if activation is enabled). If you don’t receive it, check spam or contact support.
- **More technical details**: See [README.md](./README.md), [SETUP_GUIDE.md](./SETUP_GUIDE.md), and [TECHNICAL_PAPER.md](./TECHNICAL_PAPER.md).

---

**Enjoy styling with AI.**
