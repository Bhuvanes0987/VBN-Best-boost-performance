from flask import Blueprint, request, jsonify, current_app
from extension import db, mail
from models.user_model import User
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from flask_mail import Message
import jwt, secrets

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/signup", methods=["POST"])
def signup():
    data = request.json

    if not data.get("email") or not data.get("password"):
        return jsonify({"success": False, "message": "Email and password required"}), 400

    existing = User.query.filter_by(email=data["email"]).first()
    if existing:
        return jsonify({"success": False, "message": "Email already registered."}), 409

    new_user = User(
        name=data["fullName"],
        email=data["email"],
        password_hash=generate_password_hash(data["password"]),
        school_id=data.get("schoolId"),       
        student_class=data.get("selectedClass"),
        position=2,                          
        status=1,
        created_by="self",
        created_at=datetime.utcnow()
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True, "message": "Account created successfully."})


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.json

    if not data.get("email") or not data.get("password"):
        return jsonify({"success": False, "message": "Email and password required"}), 400

    user = User.query.filter_by(email=data["email"]).first()

    if not user or user.status != 1:
        return jsonify({"success": False, "message": "No account found."}), 401

    if not check_password_hash(user.password_hash, data["password"]):
        return jsonify({"success": False, "message": "Invalid email or password."}), 401

    from models.user_role_model import UserRole
    from models.role_permission_model import RolePermission
    from models.permission_model import Permission
    from models.role_model import Role
    from models.school_model import School

    position = user.position if user.position is not None else 2
    allowed_pages = []
    role_name = None
    school_name = None
    school_id = user.school_id

    if school_id:
        school = School.query.get(school_id)
        school_name = school.name if school else None

    if position == 1:
        all_perms = Permission.query.all()
        allowed_pages = [p.page for p in all_perms]
        role_name = "admin"

    elif position == 2:
        allowed_pages = ["quiz"]
        role_name = "student"

    else:
        user_role = UserRole.query.filter_by(user_id=user.id).first()
        role = Role.query.get(position)
        if role:
            role_name = role.name

        perms = db.session.query(Permission.page)\
            .join(RolePermission, Permission.id == RolePermission.permission_id)\
            .filter(RolePermission.role_id == position).all()
        allowed_pages = [p[0] for p in perms]

        class_id = user_role.class_id if user_role else None
        subject_id = user_role.subject_id if user_role else None

    token = jwt.encode({
        "user_id": user.id,
        "email": user.email,
        "position": position,
        "school_id": school_id,
        "exp": datetime.utcnow() + timedelta(hours=8)
    }, current_app.config["SECRET_KEY"], algorithm="HS256")

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "position": position,
            "role": role_name,
            "schoolId": school_id,
            "schoolName": school_name,
            "studentClass": user.student_class,
            "allowedPages": allowed_pages
        }
    })


reset_tokens = {}

@auth_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.json
    email = data.get("email")
    user = User.query.filter_by(email=email, status=1).first()
    if not user:
        return jsonify({"success": True, "message": "If this email exists, a reset link has been sent."})

    token = secrets.token_urlsafe(32)
    reset_tokens[token] = {"user_id": user.id, "expires": datetime.utcnow() + timedelta(minutes=30)}
    reset_link = f"http://localhost:4200/reset-password?token={token}"

    try:
        msg = Message(subject="Reset Your Password", recipients=[user.email],
                      sender=current_app.config["MAIL_USERNAME"])
        msg.html = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;
                    padding:30px;border:1px solid #eee;border-radius:10px;">
            <h2 style="color:#f97316;">Password Reset Request</h2>
            <p>Hello <b>{user.name}</b>,</p>
            <a href="{reset_link}" style="display:inline-block;margin:20px 0;padding:12px 24px;
               background:#f97316;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
               Reset Password
            </a>
            <p>This link expires in 30 minutes.</p>
        </div>"""
        mail.send(msg)
    except Exception as e:
        print(f"Mail failed: {e}")

    return jsonify({"success": True, "message": "Reset link sent."})


@auth_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.json
    token = data.get("token")
    if not token or token not in reset_tokens:
        return jsonify({"success": False, "message": "Invalid or expired reset link."}), 400
    token_data = reset_tokens[token]
    if datetime.utcnow() > token_data["expires"]:
        del reset_tokens[token]
        return jsonify({"success": False, "message": "Reset link has expired."}), 400
    user = User.query.get(token_data["user_id"])
    if not user:
        return jsonify({"success": False, "message": "User not found."}), 404
    user.password_hash = generate_password_hash(data["password"])
    db.session.commit()
    del reset_tokens[token]
    return jsonify({"success": True, "message": "Password reset successfully."})