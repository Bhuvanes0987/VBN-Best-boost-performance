from extension import db
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc)

class School(db.Model):
    __tablename__ = "schools"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, unique=True)
    code = db.Column(db.String(50), unique=True)
    status = db.Column(db.Integer, default=1)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime)