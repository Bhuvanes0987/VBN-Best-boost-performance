from extension import db
from datetime import datetime


class Question(db.Model):

    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)

    question_text = db.Column(db.Text, nullable=False)

    question_type = db.Column(db.String(20), nullable=False)

    class_id = db.Column(db.Integer, db.ForeignKey("classes.id"), nullable=False)

    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id"), nullable=False)

    answer_data = db.Column(db.Text)

    map_image = db.Column(db.Text)

    status = db.Column(db.Integer, default=1)

    created_by = db.Column(db.String(100))
    updated_by = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)