import resend
from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY


def send_otp_email(to_email: str, otp_code: str, purpose: str = "verify your account"):
    """Send an OTP code via Resend API."""
    try:
        r = resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"Your verification code: {otp_code}",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <h2 style="color: #1a1a1a; margin-bottom: 16px;">Expense Manager</h2>
                <p style="color: #4a4a4a; font-size: 16px;">
                    Use the following code to {purpose}:
                </p>
                <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">
                        {otp_code}
                    </span>
                </div>
                <p style="color: #71717a; font-size: 14px;">
                    This code expires in 10 minutes. If you didn't request this, please ignore this email.
                </p>
            </div>
            """,
        })
        return r
    except Exception as e:
        raise Exception(f"Failed to send email: {str(e)}")
