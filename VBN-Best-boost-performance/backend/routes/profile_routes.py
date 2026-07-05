from flask import Blueprint, request, jsonify
from extension import db
from models.user_model import User
from models.subject_model import Subject
from models.unit_model import Unit
from models.class_model import Class
from models.school_model import School
from datetime import datetime, timezone
import json
import base64

profile_bp = Blueprint("profile", __name__)


@profile_bp.route("/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    user = User.query.get_or_404(user_id)

    class_name = None
    if user.student_class:
        cls = Class.query.get(user.student_class)
        class_name = cls.class_name if cls else None

    school_name = None
    if user.school_id:
        school = School.query.get(user.school_id)
        school_name = school.name if school else None

    selected_subjects = []
    if user.selected_subjects:
        subject_ids = json.loads(user.selected_subjects)
        for sid in subject_ids:
            s = Subject.query.get(sid)
            if s:
                selected_subjects.append({
                    "id": s.id,
                    "subject_name": s.subject_name
                })

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "class_id": user.student_class,
        "class_name": class_name,
        "school_id": user.school_id,
        "school_name": school_name,
        "profile_pic": user.profile_pic,
        "selected_subjects": selected_subjects
    })


@profile_bp.route("/profile/<int:user_id>", methods=["PUT"])
def update_profile(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json

    if data.get("name"):
        user.name = data["name"]
    if data.get("phone"):
        user.phone = data["phone"]
    if data.get("profile_pic"):
        user.profile_pic = data["profile_pic"]
    if "school_id" in data:
        user.school_id = data["school_id"] if data["school_id"] else None
    if "selected_subjects" in data:
        subject_ids = data["selected_subjects"]
        if len(subject_ids) > 5:
            return jsonify({"message": "You can select maximum 5 subjects only"}), 400
        user.selected_subjects = json.dumps(subject_ids)

    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Profile updated successfully"})


@profile_bp.route("/profile/<int:user_id>/subjects", methods=["GET"])
def get_available_subjects(user_id):
    user = User.query.get_or_404(user_id)

    if not user.student_class:
        return jsonify({"subjects": []})

    subjects = Subject.query.filter_by(status=1).all()
    result = []
    for s in subjects:
        if any(c.id == user.student_class for c in s.classes):
            result.append({
                "id": s.id,
                "subject_name": s.subject_name
            })

    return jsonify({"subjects": result})