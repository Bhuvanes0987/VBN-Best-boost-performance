from flask import Blueprint, jsonify
from models.email_log_model import EmailLog
from extension import db

email_logs_bp = Blueprint("email_logs", __name__)

@email_logs_bp.route("/email-logs", methods=["GET"])
def get_email_logs():
    logs = EmailLog.query.order_by(EmailLog.timestamp.desc()).limit(200).all()
    result = []
    for log in logs:
        result.append({
            "id": log.id,
            "recipient": log.recipient,
            "subject": log.subject,
            "status": log.status,
            "error_message": log.error_message,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None
        })
    
    return jsonify({"logs": result})
