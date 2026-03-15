from flask import Blueprint, request, jsonify
from extension import db
from models.role_model import Role
from models.role_permission_model import RolePermission
from models.permission_model import Permission

role_bp = Blueprint("roles", __name__)


# GET ROLES
@role_bp.route("/roles", methods=["GET"])
def get_roles():

    roles = Role.query.filter_by(status=1).all()

    result = []

    for r in roles:

        permissions = db.session.query(Permission.name)\
            .join(RolePermission, Permission.id == RolePermission.permission_id)\
            .filter(RolePermission.role_id == r.id)\
            .all()

        perm_list = [p[0] for p in permissions]

        result.append({
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "permissions": perm_list
        })

    return jsonify({"roles": result})


# CREATE ROLE
@role_bp.route("/roles", methods=["POST"])
def create_role():

    data = request.json

    existing = Role.query.filter_by(name=data["name"]).first()

    if existing:
        return jsonify({
            "success": False,
            "message": "Role already exists"
        }), 400

    role = Role(
        name=data["name"],
        description=data.get("description")
    )

    db.session.add(role)
    db.session.commit()

    return jsonify({
        "success": True,
        "role_id": role.id
    })


# ASSIGN PERMISSIONS
@role_bp.route("/roles/<int:role_id>/permissions", methods=["POST"])
def assign_permissions(role_id):

    data = request.json

    if not data or "permissions" not in data:
        return jsonify({"message": "No permissions provided"}), 400

    # remove old permissions
    RolePermission.query.filter_by(role_id=role_id).delete()

    for pid in data["permissions"]:

        rp = RolePermission(
            role_id=role_id,
            permission_id=int(pid)
        )

        db.session.add(rp)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Permissions assigned"
    })


# GET PERMISSIONS
@role_bp.route("/permissions", methods=["GET"])
def get_permissions():

    permissions = Permission.query.all()

    data = []

    for p in permissions:
        data.append({
            "id": p.id,
            "name": p.name
        })

    return jsonify({"permissions": data})