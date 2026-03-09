from flask import Blueprint, request, jsonify
from extension import db
from models.user_model import User
from datetime import datetime

user_bp = Blueprint("users", __name__)


# =============================
# CREATE USER
# =============================
@user_bp.route("/users", methods=["POST"])
def create_user():

    data = request.json

    student_class = data["selectedClass"]["value"] if isinstance(data["selectedClass"], dict) else data["selectedClass"]

    user = User(
        name=data["fullName"],
        email=data["email"],
        phone=data.get("phone"),
        position=data.get("position"),
        student_class=student_class,
        school_name=data["schoolName"],
        school_code=data["schoolCode"],
        status=1,
        created_by="admin",
        created_at=datetime.utcnow()
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created successfully"})


# =============================
# GET USERS (ONLY ACTIVE)
# =============================
@user_bp.route("/users", methods=["GET"])
def get_users():

    users = User.query.filter_by(status=1).all()

    result = []

    for u in users:
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "position": u.position,
            "studentClass": u.student_class,
            "schoolName": u.school_name,
            "schoolCode": u.school_code,
            "created_at": u.created_at
        })

    return jsonify({"users": result})


# =============================
# UPDATE USER
# =============================
@user_bp.route("/users/<int:id>", methods=["PUT"])
def update_user(id):

    user = User.query.get_or_404(id)

    data = request.json

    student_class = data["selectedClass"]["value"] if isinstance(data["selectedClass"], dict) else data["selectedClass"]

    user.name = data["fullName"]
    user.email = data["email"]
    user.phone = data.get("phone")
    user.position = data.get("position")
    user.student_class = student_class
    user.school_name = data["schoolName"]
    user.school_code = data["schoolCode"]

    user.updated_by = "admin"
    user.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({"message": "User updated successfully"})


# =============================
# SOFT DELETE USER
# =============================
@user_bp.route("/users/<int:id>", methods=["DELETE"])
def delete_user(id):

    user = User.query.get_or_404(id)

    user.status = 0
    user.updated_by = "admin"
    user.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify({"message": "User deactivated successfully"})