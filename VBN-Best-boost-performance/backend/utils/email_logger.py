from extension import db
from models.email_log_model import EmailLog
from datetime import datetime

def log_email(recipient, subject, status, error=None):
    """
    Logs an email attempt to the database.
    recipient: list or string
    """
    try:
        # If recipient is a list, join it
        if isinstance(recipient, list):
            recipient = ", ".join(recipient)

        log = EmailLog(
            recipient=recipient,
            subject=subject,
            status=status,
            error_message=str(error) if error else None,
            timestamp=datetime.utcnow()
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Failed to save email log: {str(e)}")
        db.session.rollback()
