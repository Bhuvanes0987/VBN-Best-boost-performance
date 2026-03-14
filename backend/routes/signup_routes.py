from flask import Blueprint, request, jsonify
from extension import db
from models.user_model import User
from werkzeug.security import generate_password_hash
from datetime import datetime

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():

    data = request.json

    existing = User.query.filter_by(email=data["email"]).first()

    if existing:
        return jsonify({"success": False, "message": "Email already registered"}), 400

    password_hash = generate_password_hash(data["password"])

    user = User(
        name=data["fullName"],
        email=data["email"],
        password_hash=password_hash,
        student_class=data["selectedClass"],
        school_name=data["schoolName"],
        school_code=data["schoolCode"],
        status=1,
        created_by="self",
        created_at=datetime.utcnow()
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Account created successfully"
    })