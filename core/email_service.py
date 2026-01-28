"""
Email Service for sending reminder notifications
"""

import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_reminder_email(to_email: str, reminder_title: str, amount: float, due_date: str, is_test: bool = False) -> bool:
    """
    Send a reminder email to the user.
    
    Args:
        to_email: Recipient email address
        reminder_title: Title of the reminder/bill
        amount: Amount due
        due_date: Due date string
        is_test: Whether this is a test email
    
    Returns:
        True if email was sent successfully, False otherwise
    """
    if not to_email:
        logger.warning("No email address provided for reminder")
        return False
    
    subject = f"{'[TEST] ' if is_test else ''}Ledger AI: Payment Reminder - {reminder_title}"
    
    # HTML email content
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .card {{ background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; margin-bottom: 24px; }}
            .logo {{ font-size: 24px; font-weight: bold; color: #18181b; }}
            .title {{ font-size: 20px; font-weight: 600; color: #18181b; margin-bottom: 8px; }}
            .amount {{ font-size: 36px; font-weight: bold; color: #18181b; margin: 16px 0; }}
            .due-date {{ font-size: 14px; color: #71717a; margin-bottom: 24px; }}
            .due-date strong {{ color: #dc2626; }}
            .footer {{ text-align: center; margin-top: 24px; font-size: 12px; color: #a1a1aa; }}
            .button {{ display: inline-block; background: #18181b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div class="logo">💰 Ledger AI</div>
                </div>
                
                <div class="title">Payment Reminder</div>
                <p style="color: #52525b; margin-bottom: 24px;">
                    {'This is a test email to verify your email settings are working correctly.' if is_test else f"Don't forget! Your <strong>{reminder_title}</strong> payment is coming up."}
                </p>
                
                <div class="amount">${amount:,.2f}</div>
                <div class="due-date">Due: <strong>{due_date}</strong></div>
                
                <p style="color: #71717a; font-size: 14px;">
                    Log in to Ledger AI to mark this payment as complete and manage your reminders.
                </p>
                
                <div class="footer">
                    <p>You're receiving this email because you enabled reminders in Ledger AI.</p>
                    <p>To unsubscribe, disable email reminders in your reminder settings.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    try:
        sent = send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        if sent:
            logger.info(f"Reminder email sent to {to_email} for '{reminder_title}'")
            return True
        else:
            logger.warning(f"Failed to send reminder email to {to_email}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending reminder email: {e}")
        return False


def send_due_reminders():
    """
    Check for reminders due soon and send email notifications.
    This function should be called periodically (e.g., via cron or Celery).
    """
    from datetime import date, timedelta
    from django.utils import timezone
    from .models import Reminder
    
    today = date.today()
    reminders_sent = 0
    
    # Get all unpaid reminders with email_reminder enabled
    reminders = Reminder.objects.filter(
        is_paid=False,
        email_reminder=True,
    ).select_related('owner')
    
    for reminder in reminders:
        # Check if reminder is due within the reminder_days_before window
        reminder_date = reminder.due_date - timedelta(days=reminder.reminder_days_before)
        
        if reminder_date <= today <= reminder.due_date:
            # Check if we already sent an email today
            if reminder.last_email_sent:
                if reminder.last_email_sent.date() >= today:
                    continue  # Already sent today
            
            # Send the email
            success = send_reminder_email(
                to_email=reminder.owner.email,
                reminder_title=reminder.title,
                amount=float(reminder.amount),
                due_date=reminder.due_date.strftime('%B %d, %Y')
            )
            
            if success:
                reminder.last_email_sent = timezone.now()
                reminder.save(update_fields=['last_email_sent'])
                reminders_sent += 1
    
    logger.info(f"Sent {reminders_sent} reminder emails")
    return reminders_sent
