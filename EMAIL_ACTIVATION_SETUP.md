# Email Activation Setup Guide

## Overview
The application now requires users to activate their email address before they can log in. When a user registers, they receive an activation email with a link. Only after clicking the link can they log in.

## Backend Configuration

### Required Environment Variables

Add these to your `.env` file or Railway environment variables:

```env
# Email Configuration
EMAIL_ENABLED=true
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
EMAIL_FROM_ADDRESS=your-email@gmail.com
EMAIL_FROM_NAME=Outfit Suggestor

# Frontend URL (for activation links)
FRONTEND_URL=http://localhost:3000  # For production: https://sajadparacha.github.io/outfit-suggestor-app

# Activation token expiration (in hours, default 24)
ACTIVATION_TOKEN_EXPIRE_HOURS=24
```

### Email Provider Setup

#### Gmail Setup:
1. Enable 2-Step Verification on your Google account
2. Generate an "App Password":
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `EMAIL_SMTP_PASSWORD`

#### Other SMTP Providers:
- **SendGrid**: Use `smtp.sendgrid.net` with port 587
- **Mailgun**: Use `smtp.mailgun.org` with port 587
- **Custom SMTP**: Update `EMAIL_SMTP_HOST` and `EMAIL_SMTP_PORT` accordingly

### Database Migration

The User model now includes:
- `email_verified` (boolean, default False)
- `activation_token` (string, nullable)
- `activation_token_expires` (datetime, nullable)

**For existing users**, you need to:
1. Run a database migration to add these columns
2. Set `email_verified=True` for existing users (if you want them to continue working)
3. Clear any existing `activation_token` values

Example migration script (run in Python):
```python
from models.database import SessionLocal
from models.user import User

db = SessionLocal()
try:
    # Set all existing users as verified (optional)
    users = db.query(User).all()
    for user in users:
        user.email_verified = True
        user.activation_token = None
        user.activation_token_expires = None
    db.commit()
    print(f"Updated {len(users)} users")
finally:
    db.close()
```

## Frontend Configuration

The frontend automatically handles:
- Showing activation message after registration
- Processing activation links from email
- Redirecting to login after successful activation

No additional configuration needed for the frontend.

## Testing Email Activation

### Disable Email for Development:
Set `EMAIL_ENABLED=false` in your `.env` file. The system will skip sending emails but registration will still work (you'll need to manually activate accounts).

### Manual Activation:
You can manually activate a user via database:
```python
from models.database import SessionLocal
from models.user import User

db = SessionLocal()
user = db.query(User).filter(User.email == 'user@example.com').first()
if user:
    user.email_verified = True
    user.activation_token = None
    user.activation_token_expires = None
    db.commit()
```

## Flow

1. **Registration**: User submits registration form
   - Account is created with `email_verified=False`
   - Activation token is generated
   - Activation email is sent
   - User sees "Check your email" message

2. **Email Activation**: User clicks link in email
   - Link contains activation token
   - Frontend calls `/api/auth/activate/{token}`
   - Backend verifies token and activates account
   - User is redirected to login

3. **Login**: User attempts to log in
   - Backend checks `email_verified=True`
   - If not verified, login is rejected with message
   - If verified, login proceeds normally

## Error Handling

- **Invalid Token**: Shows error message, allows user to register again
- **Expired Token**: Shows error message, user must register again
- **Email Send Failure**: Registration fails with error (if EMAIL_ENABLED=true)
- **Already Activated**: Shows success message and redirects to login

## Security Features

- Activation tokens expire after 24 hours (configurable)
- Tokens are securely generated using `secrets.token_urlsafe()`
- Tokens are single-use (cleared after activation)
- Email verification prevents fake email registrations









