from flask import Blueprint, request, jsonify
from extension import db
from models.role_model import Role
from models.role_permission_model import RolePermission

role_bp = Blueprint("roles", __name__)


# =============================
# CREATE ROLE
# =============================
@role_bp.route("/roles", methods=["POST"])
def create_role():

    data = request.json

    role = Role(
        name=data["name"],
        description=data.get("description")
    )

    db.session.add(role)
    db.session.commit()

    return jsonify({"message": "Role created successfully"})


# =============================
# ASSIGN PERMISSIONS TO ROLE
# =============================
@role_bp.route("/roles/<int:role_id>/permissions", methods=["POST"])
def assign_permissions(role_id):

    data = request.json

    for pid in data["permissions"]:

        rp = RolePermission(
            role_id=role_id,
            permission_id=pid
        )

        db.session.add(rp)

    db.session.commit()

    return jsonify({"message":"Permissions assigned"})