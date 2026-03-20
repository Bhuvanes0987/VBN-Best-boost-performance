from flask import Blueprint, request, jsonify, current_app
from extension import db, mail
from models.user_model import User
from models.school_model import School
from models.class_model import Class
from datetime import datetime
from werkzeug.security import generate_password_hash
from flask_mail import Message
import random, string

user_bp = Blueprint("users", __name__)

def generate_temp_password():
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(8))

def send_email(to, subject, html):
    try:
        msg = Message(subject=subject, recipients=[to],
                      sender=current_app.config["MAIL_USERNAME"])
        msg.html = html
        mail.send(msg)
    except Exception as e:
        print(f"Mail failed: {e}")


@user_bp.route("/users", methods=["POST"])
def create_user():
    data = request.json

    existing = User.query.filter_by(email=data["email"]).first()
    if existing:
        return jsonify({"message": "User with this email already exists"}), 400

    temp_password = generate_temp_password()
    assigned_role = int(data.get("selectedRole", 2))

    user = User(
        name=data["fullName"],
        email=data["email"],
        password_hash=generate_password_hash(temp_password),
        position=assigned_role,
        student_class=data.get("selectedClass"),
        school_id=data.get("schoolId"),   
        status=1,
        created_by="admin",
        created_at=datetime.utcnow()
    )
    db.session.add(user)
    db.session.commit()

    from models.user_role_model import UserRole
    ur = UserRole(
        user_id=user.id,
        role_id=assigned_role,
        school_id=data.get("schoolId"),
        class_id=data.get("selectedClass"),
        subject_id=data.get("selectedSubject") 
    )
    db.session.add(ur)
    db.session.commit()

    send_email(
        to=user.email,
        subject="Your Quiz Platform Account",
        html=f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;
                    padding:30px;border:1px solid #eee;border-radius:10px;">
            <h2 style="color:#f97316;">Welcome to Quiz Platform!</h2>
            <p>Hello <b>{user.name}</b>,</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                <tr><td style="padding:8px;background:#fff7ed;"><b>Email</b></td>
                    <td style="padding:8px;">{user.email}</td></tr>
                <tr><td style="padding:8px;background:#fff7ed;"><b>Temporary Password</b></td>
                    <td style="padding:8px;font-weight:bold;color:#f97316;">{temp_password}</td></tr>
            </table>
            <p>Please <a href="http://localhost:4200/login" style="color:#f97316;">login</a>
               and change your password immediately.</p>
        </div>"""
    )
    return jsonify({"message": "User created successfully", "user_id": user.id}), 201


@user_bp.route("/users", methods=["GET"])
def get_users():
    from models.user_role_model import UserRole

    school_id = request.args.get("school_id")
    query = User.query.filter_by(status=1)
    if school_id:
        query = query.filter_by(school_id=int(school_id))
    users = query.all()

    result = []
    for u in users:
        class_name = None
        if u.student_class:
            cls = Class.query.get(u.student_class)
            class_name = cls.class_name if cls else None

        school_name = None
        if u.school_id:
            school = School.query.get(u.school_id)
            school_name = school.name if school else None

        user_role = UserRole.query.filter_by(user_id=u.id).first()

        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "position": int(u.position) if u.position is not None else 2,
            "studentClass": u.student_class,
            "studentClassName": class_name,
            "schoolId": u.school_id,
            "schoolName": school_name,
            "roleId": user_role.role_id if user_role else None,
            "classScope": user_role.class_id if user_role else None,
            "subjectScope": user_role.subject_id if user_role else None,
            "created_at": u.created_at
        })
    return jsonify({"users": result})


@user_bp.route("/users/<int:id>", methods=["PUT"])
def update_user(id):
    from models.user_role_model import UserRole

    user = User.query.get_or_404(id)
    data = request.json

    user.name = data["fullName"]
    user.email = data["email"]
    user.phone = data.get("phone")
    user.student_class = data.get("selectedClass")
    user.school_id = data.get("schoolId")  
    user.updated_by = "admin"
    user.updated_at = datetime.utcnow()

    if data.get("selectedRole"):
        new_role = int(data["selectedRole"])
        user.position = new_role
        UserRole.query.filter_by(user_id=id).delete()
        db.session.add(UserRole(
            user_id=id,
            role_id=new_role,
            school_id=data.get("schoolId"),
            class_id=data.get("selectedClass"),
            subject_id=data.get("selectedSubject")
        ))

    db.session.commit()
    return jsonify({"message": "User updated successfully"})


@user_bp.route("/users/<int:id>", methods=["DELETE"])
def delete_user(id):
    user = User.query.get_or_404(id)
    user.status = 0
    user.updated_by = "admin"
    user.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "User deactivated successfully"})