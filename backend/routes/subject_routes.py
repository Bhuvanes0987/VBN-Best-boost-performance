from flask import Blueprint, request, jsonify
from extension import db
from models.subject_model import Subject
from models.class_model import Class
from datetime import datetime

subject_bp = Blueprint("subjects", __name__)


# CREATE SUBJECT
@subject_bp.route("/subjects", methods=["POST"])
def create_subject():

    data = request.json

    subject = Subject(
        subject_name=data["subject_name"],
        created_by="admin"
    )

    class_ids = data.get("class_ids", [])

    classes = Class.query.filter(Class.id.in_(class_ids)).all()

    subject.classes = classes

    db.session.add(subject)
    db.session.commit()

    return jsonify({"message": "Subject created successfully"})


# GET SUBJECTS
@subject_bp.route("/subjects", methods=["GET"])
def get_subjects():

    subjects = Subject.query.filter_by(status=1).all()

    result = []

    for s in subjects:

        result.append({
            "id": s.id,
            "subject_name": s.subject_name,
            "classes": [
                {
                    "id": c.id,
                    "class_name": c.class_name
                }
                for c in s.classes
            ]
        })

    return jsonify({"subjects": result})


# UPDATE SUBJECT
@subject_bp.route("/subjects/<int:id>", methods=["PUT"])
def update_subject(id):

    subject = Subject.query.get_or_404(id)

    data = request.json

    subject.subject_name = data["subject_name"]
    subject.updated_by = "admin"
    subject.updated_at = datetime.utcnow()

    class_ids = data.get("class_ids", [])

    classes = Class.query.filter(Class.id.in_(class_ids)).all()

    subject.classes = classes

    db.session.commit()

    return jsonify({"message": "Subject updated successfully"})


# DELETE SUBJECT (SOFT DELETE)
@subject_bp.route("/subjects/<int:id>", methods=["DELETE"])
def delete_subject(id):

    subject = Subject.query.get_or_404(id)

    subject.status = 0
    subject.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({"message": "Subject deleted successfully"})