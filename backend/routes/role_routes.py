from flask import Blueprint, request, jsonify
from extension import db
from models.role_model import Role
from models.role_permission_model import RolePermission
from models.permission_model import Permission

role_bp = Blueprint("roles", __name__)

@role_bp.route("/roles", methods=["GET"])
def get_roles():
    school_id = request.args.get("school_id")
    query = Role.query.filter(Role.status == 1, Role.id > 2)
    if school_id:
        query = query.filter(
            db.or_(Role.school_id == int(school_id), Role.school_id == None)
        )
    roles = query.all()
    result = []
    for r in roles:
        permissions = db.session.query(Permission.id, Permission.name)\
            .join(RolePermission, Permission.id == RolePermission.permission_id)\
            .filter(RolePermission.role_id == r.id).all()
        result.append({
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "school_id": r.school_id,
            "role_type": r.role_type,
            "permissions": [{"id": p[0], "name": p[1]} for p in permissions]
        })
    return jsonify({"roles": result})


@role_bp.route("/roles/all", methods=["GET"])
def get_all_roles():
    school_id = request.args.get("school_id")
    query = Role.query.filter_by(status=1)
    if school_id:
        query = query.filter(
            db.or_(Role.school_id == int(school_id), Role.school_id == None)
        )
    roles = query.all()
    return jsonify({"roles": [{"id": r.id, "name": r.name,
                                "role_type": r.role_type} for r in roles]})


@role_bp.route("/roles", methods=["POST"])
def create_role():
    data = request.json

    existing = Role.query.filter_by(name=data["name"], status=1).first()
    if existing:
        return jsonify({"success": False, "message": "Role already exists"}), 400

    deleted = Role.query.filter(
        Role.name == data["name"], Role.status == 0, Role.id > 2
    ).first()
    if deleted:
        deleted.status = 1
        deleted.description = data.get("description")
        deleted.school_id = data.get("school_id")
        deleted.role_type = data.get("role_type", "custom")
        db.session.commit()
        RolePermission.query.filter_by(role_id=deleted.id).delete()
        for pid in data.get("permissions", []):
            db.session.add(RolePermission(role_id=deleted.id, permission_id=int(pid)))
        db.session.commit()
        return jsonify({"success": True, "role_id": deleted.id})

    role = Role(
        name=data["name"],
        description=data.get("description"),
        school_id=data.get("school_id"),    
        role_type=data.get("role_type", "custom"),
        status=1
    )
    db.session.add(role)
    db.session.commit()

    for pid in data.get("permissions", []):
        db.session.add(RolePermission(role_id=role.id, permission_id=int(pid)))
    db.session.commit()

    return jsonify({"success": True, "role_id": role.id})


@role_bp.route("/roles/<int:role_id>", methods=["PUT"])
def update_role(role_id):
    if role_id in [1, 2]:
        return jsonify({"success": False, "message": "Cannot modify default roles"}), 403
    role = Role.query.get_or_404(role_id)
    data = request.json
    role.name = data["name"]
    role.description = data.get("description")
    role.school_id = data.get("school_id", role.school_id)
    role.role_type = data.get("role_type", role.role_type)
    RolePermission.query.filter_by(role_id=role_id).delete()
    for pid in data.get("permissions", []):
        db.session.add(RolePermission(role_id=role_id, permission_id=int(pid)))
    db.session.commit()
    return jsonify({"success": True, "message": "Role updated"})


@role_bp.route("/roles/<int:role_id>", methods=["DELETE"])
def delete_role(role_id):
    if role_id in [1, 2]:
        return jsonify({"success": False, "message": "Cannot delete default roles"}), 403
    role = Role.query.get_or_404(role_id)
    role.status = 0
    db.session.commit()
    return jsonify({"success": True, "message": "Role deleted"})


@role_bp.route("/roles/<int:role_id>/permissions", methods=["POST"])
def assign_permissions(role_id):
    data = request.json
    RolePermission.query.filter_by(role_id=role_id).delete()
    for pid in data.get("permissions", []):
        db.session.add(RolePermission(role_id=role_id, permission_id=int(pid)))
    db.session.commit()
    return jsonify({"success": True, "message": "Permissions assigned"})


@role_bp.route("/permissions", methods=["GET"])
def get_permissions():
    permissions = Permission.query.all()
    return jsonify({"permissions": [{"id": p.id, "name": p.name,
                                      "page": p.page, "scope": p.scope} for p in permissions]})