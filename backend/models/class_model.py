from extension import db
from datetime import datetime


class Class(db.Model):

    __tablename__ = "classes"

    id = db.Column(db.Integer, primary_key=True)

    class_name = db.Column(db.String(100), nullable=False, unique=True)

    status = db.Column(db.Integer, default=1)

    created_by = db.Column(db.String(100))
    updated_by = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)