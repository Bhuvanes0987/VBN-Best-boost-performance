from extension import db
from datetime import datetime

class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"), nullable=True)
    role_type = db.Column(db.String(50), default='custom')

    status = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)