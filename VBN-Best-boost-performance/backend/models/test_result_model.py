from extension import db
from datetime import datetime

class TestResult(db.Model):
    __tablename__ = "test_results"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id"))
    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"))
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"))
    unit_id = db.Column(db.Integer, db.ForeignKey("units.id"))

    total_questions = db.Column(db.Integer)
    correct_answers = db.Column(db.Integer)
    score_percent = db.Column(db.Float)

    test_type = db.Column(db.String(50))

    taken_at = db.Column(db.DateTime, default=datetime.utcnow)