from extension import db
from datetime import datetime

class Unit(db.Model):
    __tablename__ = "units"

    id = db.Column(db.Integer, primary_key=True)
    unit_name = db.Column(db.String(150), nullable=False)
    unit_number = db.Column(db.Integer)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"))
    status = db.Column(db.Integer, default=1)
    created_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)