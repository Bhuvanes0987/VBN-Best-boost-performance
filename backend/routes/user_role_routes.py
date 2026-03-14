from flask import Blueprint, request, jsonify
from extension import db
from models.user_role_model import UserRole

# create blueprint
user_role_bp = Blueprint("user_roles", __name__)


# =============================
# ASSIGN ROLE TO USER
# =============================
@user_role_bp.route("/users/<int:user_id>/role", methods=["POST"])
def assign_role(user_id):

    data = request.json

    ur = UserRole(
        user_id=user_id,
        role_id=data["role_id"]
    )

    db.session.add(ur)
    db.session.commit()

    return jsonify({"message": "Role assigned"})