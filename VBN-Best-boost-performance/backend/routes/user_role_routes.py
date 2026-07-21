from flask import Blueprint, request, jsonify, current_app
from extension import db, mail
from models.user_role_model import UserRole
from models.user_model import User
from models.role_model import Role
from flask_mail import Message
from utils.email_logger import log_email

user_role_bp = Blueprint("user_roles", __name__)

def send_role_email(user, role_name):
    try:
        msg = Message(subject="You've Been Assigned a Role",
                      recipients=[user.email],
                      sender=current_app.config["MAIL_USERNAME"])
        msg.html = f"""
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;
                    padding:30px;border:1px solid #eee;border-radius:10px;">
            <h2 style="color:#f97316;">Role Assignment</h2>
            <p>Hello <b>{user.name}</b>,</p>
            <p>You have been assigned the role: <b style="color:#f97316;">{role_name}</b></p>
            <p><a href="http://localhost:4200/login" style="color:#f97316;">Login here</a></p>
        </div>"""
        mail.send(msg)
        log_email(user.email, "Role Assignment", "Success")
    except Exception as e:
        print(f"Role email failed: {e}")
        log_email(user.email, "Role Assignment", "Failed", error=str(e))

@user_role_bp.route("/users/<int:user_id>/role", methods=["POST"])
def assign_role(user_id):
    data = request.json

    UserRole.query.filter_by(user_id=user_id).delete()

    ur = UserRole(
        user_id=user_id,
        role_id=data["role_id"],
        school_id=data.get("school_id"),    
        class_id=data.get("class_id"),      
        subject_id=data.get("subject_id")   
    )
    db.session.add(ur)

    user = User.query.get(user_id)
    if user:
        user.position = data["role_id"]
    db.session.commit()

    role = Role.query.get(data["role_id"])
    if user and role:
        send_role_email(user, role.name)

    return jsonify({"message": "Role assigned"})