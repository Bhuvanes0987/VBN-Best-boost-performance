from extension import db
from datetime import datetime


# Mapping table for Many-to-Many
subject_classes = db.Table(
    "subject_classes",

    db.Column("subject_id", db.Integer, db.ForeignKey("subjects.id"), primary_key=True),

    db.Column("class_id", db.Integer, db.ForeignKey("classes.id"), primary_key=True)
)


class Subject(db.Model):

    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True)

    subject_name = db.Column(db.String(150), nullable=False)

    status = db.Column(db.Integer, default=1)

    created_by = db.Column(db.String(100))
    updated_by = db.Column(db.String(100))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime)

    # MANY TO MANY RELATIONSHIP
    classes = db.relationship(
        "Class",
        secondary=subject_classes,
        backref=db.backref("subjects", lazy="dynamic")
    )

