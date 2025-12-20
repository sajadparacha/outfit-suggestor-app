"""
Email service for sending activation emails and notifications.
Uses SMTP to send emails - works with Gmail, SendGrid, Mailgun, etc.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

try:  # Support running both as a package (backend.*) and from backend/ directly
    from config import Config
except ImportError:  # When imported as backend.utils.email_service
    from backend.config import Config

logger = logging.getLogger(__name__)


def send_activation_email(
    to_email: str,
    activation_token: str,
    user_name: Optional[str] = None
) -> bool:
    """
    Send email activation link to user.
    
    Args:
        to_email: Recipient email address
        activation_token: Activation token for the account
        user_name: Optional user's full name for personalization
        
    Returns:
        True if email sent successfully, False otherwise
    """
    if not Config.EMAIL_ENABLED:
        logger.warning(f"Email is disabled. Skipping activation email to {to_email}")
        return False
    
    if not Config.EMAIL_SMTP_USER or not Config.EMAIL_SMTP_PASSWORD:
        logger.error("EMAIL_SMTP_USER or EMAIL_SMTP_PASSWORD not configured")
        return False
    
    try:
        # Create activation link
        activation_link = f"{Config.FRONTEND_URL}/activate?token={activation_token}"
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Activate Your Outfit Suggestor Account'
        msg['From'] = f"{Config.EMAIL_FROM_NAME} <{Config.EMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        
        # Create email content
        greeting = f"Hi {user_name}," if user_name else "Hi,"
        
        text_content = f"""
{greeting}

Thank you for registering with Outfit Suggestor!

Please click on the following link to activate your account:
{activation_link}

This link will expire in {Config.ACTIVATION_TOKEN_EXPIRE_HOURS} hours.

If you didn't create an account, please ignore this email.

Best regards,
Outfit Suggestor Team
"""
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #4F46E5;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }}
        .content {{
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 5px 5px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Outfit Suggestor!</h1>
        </div>
        <div class="content">
            <p>{greeting}</p>
            <p>Thank you for registering with Outfit Suggestor!</p>
            <p>Please click on the following button to activate your account:</p>
            <p style="text-align: center;">
                <a href="{activation_link}" class="button">Activate Account</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4F46E5;">{activation_link}</p>
            <p><strong>Note:</strong> This link will expire in {Config.ACTIVATION_TOKEN_EXPIRE_HOURS} hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            <div class="footer">
                <p>Best regards,<br>Outfit Suggestor Team</p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        # Attach both plain text and HTML versions
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email via SMTP
        with smtplib.SMTP(Config.EMAIL_SMTP_HOST, Config.EMAIL_SMTP_PORT) as server:
            server.starttls()  # Enable encryption
            server.login(Config.EMAIL_SMTP_USER, Config.EMAIL_SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Activation email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send activation email to {to_email}: {str(e)}")
        return False


def send_email(
    to_email: str,
    subject: str,
    text_content: str,
    html_content: Optional[str] = None
) -> bool:
    """
    Generic function to send email.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        text_content: Plain text email content
        html_content: Optional HTML email content
        
    Returns:
        True if email sent successfully, False otherwise
    """
    if not Config.EMAIL_ENABLED:
        logger.warning(f"Email is disabled. Skipping email to {to_email}")
        return False
    
    if not Config.EMAIL_SMTP_USER or not Config.EMAIL_SMTP_PASSWORD:
        logger.error("EMAIL_SMTP_USER or EMAIL_SMTP_PASSWORD not configured")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{Config.EMAIL_FROM_NAME} <{Config.EMAIL_FROM_ADDRESS}>"
        msg['To'] = to_email
        
        part1 = MIMEText(text_content, 'plain')
        msg.attach(part1)
        
        if html_content:
            part2 = MIMEText(html_content, 'html')
            msg.attach(part2)
        
        with smtplib.SMTP(Config.EMAIL_SMTP_HOST, Config.EMAIL_SMTP_PORT) as server:
            server.starttls()
            server.login(Config.EMAIL_SMTP_USER, Config.EMAIL_SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False





