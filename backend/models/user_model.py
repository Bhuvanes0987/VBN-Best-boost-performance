from extension import db
from datetime import datetime

class User(db.Model):

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(150), nullable=False)

    email = db.Column(db.String(150), unique=True, nullable=False)

    phone = db.Column(db.String(20))

    position = db.Column(db.String(100))

    student_class = db.Column(db.String(20))

    school_name = db.Column(db.String(200))

    school_code = db.Column(db.String(50))

    status = db.Column(db.Integer, default=1)

    created_by = db.Column(db.String(100))

    updated_by = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    updated_at = db.Column(db.DateTime)