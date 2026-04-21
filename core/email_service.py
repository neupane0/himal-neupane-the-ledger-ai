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
            .pay-section {{ margin-top: 28px; padding-top: 24px; border-top: 1px solid #e4e4e7; }}
            .pay-title {{ font-size: 14px; font-weight: 600; color: #18181b; margin-bottom: 14px; }}
            .pay-buttons {{ text-align: center; }}
            .pay-btn {{ display: inline-block; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; margin: 0 6px 8px 6px; }}
            .khalti-btn {{ background: #5C2D91; color: #ffffff; }}
            .esewa-btn {{ background: #60BB46; color: #ffffff; }}
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
                
                <div class="pay-section">
                    <div class="pay-title">Pay Now</div>
                    <div class="pay-buttons">
                        <a href="https://app.khalti.com/" class="pay-btn khalti-btn" target="_blank">Pay with Khalti</a>
                        <a href="https://esewa.com.np/" class="pay-btn esewa-btn" target="_blank">Pay with eSewa</a>
                    </div>
                </div>
                
                <p style="color: #71717a; font-size: 14px; margin-top: 24px;">
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


def send_otp_email(to_email: str, username: str, otp_code: str) -> bool:
    """Send an OTP password-reset email."""
    if not to_email:
        return False

    subject = "Ledger AI: Your Password Reset Code"
    html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .card {{ background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
            .logo {{ font-size: 24px; font-weight: bold; color: #18181b; text-align: center; margin-bottom: 24px; }}
            .otp {{ font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #18181b; text-align: center; margin: 28px 0; background: #f4f4f5; border-radius: 12px; padding: 20px; }}
            .note {{ font-size: 13px; color: #71717a; text-align: center; margin-top: 16px; }}
            .footer {{ text-align: center; margin-top: 24px; font-size: 12px; color: #a1a1aa; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="logo">💰 Ledger AI</div>
                <h2 style="text-align:center; color:#18181b;">Password Reset</h2>
                <p style="color:#52525b; text-align:center;">Hi {username}, use the code below to reset your password. It expires in <strong>10 minutes</strong>.</p>
                <div class="otp">{otp_code}</div>
                <p class="note">If you didn't request a password reset, you can safely ignore this email.</p>
                <div class="footer">Ledger AI · Secure Finance Tracker</div>
            </div>
        </div>
    </body>
    </html>
    """
    from django.utils.html import strip_tags
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
        return bool(sent)
    except Exception as e:
        logger.error(f"Error sending OTP email: {e}")
        return False


def send_payment_info_request_email(to_email: str, to_username: str, from_username: str, group_name: str) -> bool:
    """Ask a group member to add their payment info so others can settle debts."""
    if not to_email:
        return False
    subject = f"Ledger AI: {from_username} needs your payment info for '{group_name}'"
    html_message = f"""
    <!DOCTYPE html><html><head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:0; background:#f4f4f5; }}
        .container {{ max-width:600px; margin:0 auto; padding:40px 20px; }}
        .card {{ background:white; border-radius:16px; padding:32px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); }}
        .logo {{ font-size:24px; font-weight:bold; color:#18181b; text-align:center; margin-bottom:24px; }}
        .highlight {{ background:#f4f4f5; border-radius:12px; padding:16px 20px; margin:20px 0; font-size:15px; color:#18181b; }}
        .btn {{ display:inline-block; background:#18181b; color:#fff; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:600; margin-top:20px; }}
        .footer {{ text-align:center; margin-top:24px; font-size:12px; color:#a1a1aa; }}
    </style></head><body>
    <div class="container"><div class="card">
        <div class="logo">💰 Ledger AI</div>
        <h2 style="text-align:center;color:#18181b;">Payment Info Needed</h2>
        <p style="color:#52525b;">Hi <strong>{to_username}</strong>,</p>
        <p style="color:#52525b;">
            <strong>{from_username}</strong> wants to settle their share in the group
            <strong>"{group_name}"</strong> and needs your payment details.
        </p>
        <div class="highlight">
            Please add your <strong>eSewa ID</strong> or <strong>bank account number</strong>
            in your Ledger AI profile so your group members can pay you.
        </div>
        <p style="color:#52525b;">Log in to Ledger AI → Profile → Payment Info to add your details.</p>
        <div class="footer">Ledger AI · Shared Expense Tracker</div>
    </div></div></body></html>
    """
    from django.utils.html import strip_tags
    try:
        sent = send_mail(
            subject=subject,
            message=strip_tags(html_message),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
        )
        return bool(sent)
    except Exception as e:
        logger.error(f"Error sending payment info request email: {e}")
        return False


def send_budget_alert_email(to_email: str, username: str, category: str, spent: float, limit: float, percent: int) -> bool:
    """Send a budget threshold alert (90% or 100%+) to the user."""
    if not to_email:
        return False

    over = percent >= 100
    color = '#dc2626' if over else '#f59e0b'
    label = 'Over Budget' if over else 'Budget Warning'
    subject = f"Ledger AI: {'Over budget' if over else 'Approaching budget limit'} — {category}"

    html_message = f"""
    <!DOCTYPE html><html><head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:0; background:#f4f4f5; }}
        .container {{ max-width:600px; margin:0 auto; padding:40px 20px; }}
        .card {{ background:white; border-radius:16px; padding:32px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); }}
        .logo {{ font-size:24px; font-weight:bold; color:#18181b; text-align:center; margin-bottom:24px; }}
        .badge {{ display:inline-block; background:{color}22; color:{color}; font-size:13px; font-weight:700;
                  padding:4px 14px; border-radius:999px; margin-bottom:16px; }}
        .bar-wrap {{ background:#f4f4f5; border-radius:999px; height:12px; margin:16px 0; overflow:hidden; }}
        .bar-fill {{ background:{color}; height:12px; border-radius:999px; width:{min(percent, 100)}%; }}
        .stats {{ display:flex; gap:20px; margin:20px 0; }}
        .stat {{ flex:1; background:#f9f9f9; border-radius:12px; padding:14px 16px; }}
        .stat-label {{ font-size:11px; color:#71717a; text-transform:uppercase; letter-spacing:.05em; }}
        .stat-value {{ font-size:22px; font-weight:700; color:#18181b; margin-top:4px; }}
        .footer {{ text-align:center; margin-top:24px; font-size:12px; color:#a1a1aa; }}
    </style></head><body>
    <div class="container"><div class="card">
        <div class="logo">💰 Ledger AI</div>
        <div style="text-align:center;">
            <span class="badge">{label}</span>
            <h2 style="color:#18181b;margin:0 0 8px;">{category} Budget</h2>
            <p style="color:#52525b;">Hi <strong>{username}</strong>, you've used <strong>{percent}%</strong> of your {category} budget{"" if not over else " and gone over the limit"}.</p>
        </div>
        <div class="bar-wrap"><div class="bar-fill"></div></div>
        <div class="stats">
            <div class="stat">
                <div class="stat-label">Spent</div>
                <div class="stat-value" style="color:{color};">${spent:,.2f}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Budget Limit</div>
                <div class="stat-value">${limit:,.2f}</div>
            </div>
            <div class="stat">
                <div class="stat-label">{"Over by" if over else "Remaining"}</div>
                <div class="stat-value" style="color:{'#dc2626' if over else '#16a34a'};">
                    ${'%.2f' % abs(limit - spent)}
                </div>
            </div>
        </div>
        <p style="color:#52525b;font-size:14px;">
            {'Consider reviewing your spending in this category to avoid going further over budget.' if over else 'You are close to your limit. Review your upcoming expenses to stay on track.'}
        </p>
        <div class="footer">Ledger AI · Smart Budget Alerts</div>
    </div></div></body></html>
    """
    try:
        sent = send_mail(
            subject=subject,
            message=strip_tags(html_message),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
        )
        return bool(sent)
    except Exception as e:
        logger.error(f"Error sending budget alert email: {e}")
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
